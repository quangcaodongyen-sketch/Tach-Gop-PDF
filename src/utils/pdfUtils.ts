import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { BlankPageInfo, RotatePageInfo } from '../types';

// Set up worker for pdfjs-dist using Vite bundled worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Get total page count of a PDF file
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
}

/**
 * Parse page range string like "1, 3, 5-10" into sorted unique 0-based page indices
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  if (!rangeStr.trim()) return [];

  const parts = rangeStr.split(/[,;\s]+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Split PDF according to requested page ranges or page numbers
 */
export async function splitPdf(file: File, rangeStr: string): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const targetIndices = parsePageRanges(rangeStr, totalPages);
  if (targetIndices.length === 0) {
    throw new Error(`Không tìm thấy trang hợp lệ. Tổng số trang: ${totalPages}`);
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Merge multiple PDF files into one single PDF document
 */
export async function mergePdfs(
  files: File[],
  onProgress?: (index: number, total: number) => void,
  cancelledRef?: { current: boolean }
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error('Cần ít nhất một file PDF để gộp.');
  }

  const mergedDoc = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    if (cancelledRef?.current) throw new Error('Đã hủy tiến trình.');
    if (onProgress) onProgress(i, files.length);
    const arrayBuffer = await files[i].arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  if (onProgress) onProgress(files.length, files.length);
  return await mergedDoc.save();
}

/**
 * Scan PDF pages and detect blank / near-blank pages
 */
export async function detectBlankPages(
  file: File,
  onProgress?: (processed: number, total: number) => void,
  cancelledRef?: { current: boolean }
): Promise<BlankPageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const results: BlankPageInfo[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (cancelledRef?.current) break;
    if (onProgress) onProgress(pageNum - 1, totalPages);
    try {
      const page = await pdf.getPage(pageNum);

      // Extract text
      const textContent = await page.getTextContent();
      const fullText = textContent.items.map((item: any) => item.str || '').join('').trim();
      const textLength = fullText.length;

      // Render thumbnail on canvas to check visual pixel density
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      let nonWhiteRatio = 0;
      let canvasThumbnail = '';

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvasThumbnail = canvas.toDataURL('image/jpeg', 0.6);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let nonWhitePixels = 0;
        const totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Check if pixel is significantly different from pure white/off-white background
          if (r < 240 || g < 240 || b < 240) {
            nonWhitePixels++;
          }
        }

        nonWhiteRatio = nonWhitePixels / totalPixels;
      }

      // Cleanup canvas to free memory
      canvas.width = 0;
      canvas.height = 0;

      // A page is considered blank if text length is tiny (< 5 chars) and non-white pixel ratio is very small (< 0.01)
      const isBlank = textLength < 5 && nonWhiteRatio < 0.01;
      const score = isBlank ? 1 - nonWhiteRatio : 0;

      results.push({
        pageIndex: pageNum - 1,
        pageNumber: pageNum,
        isBlank,
        score,
        textLength,
        canvasThumbnail,
        selectedForDeletion: isBlank, // Auto-select blank pages for deletion
      });
    } catch (err) {
      console.warn(`Error scanning page ${pageNum}:`, err);
      results.push({
        pageIndex: pageNum - 1,
        pageNumber: pageNum,
        isBlank: false,
        score: 0,
        textLength: 0,
        canvasThumbnail: '',
        selectedForDeletion: false,
      });
    }
  }

  if (onProgress) onProgress(totalPages, totalPages);
  return results;
}

/**
 * Remove selected pages from PDF and return clean PDF
 */
export async function removePagesFromPdf(file: File, pageNumbersToRemove: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const removeSet = new Set(pageNumbersToRemove);
  const keepIndices: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    if (!removeSet.has(i + 1)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error('Tất cả các trang đều bị chọn xóa. Vui lòng giữ lại ít nhất một trang.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, keepIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return await newDoc.save();
}

/**
 * Load PDF page original rotation and generate canvas thumbnails
 */
export async function loadPdfPagesForRotation(
  file: File,
  onProgress?: (processed: number, total: number) => void,
  cancelledRef?: { current: boolean }
): Promise<RotatePageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  // Get original rotations from pdf-lib
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const originalRotations: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    originalRotations.push(page.getRotation().angle);
  }

  // Generate previews using pdfjs-dist
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const results: RotatePageInfo[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (cancelledRef?.current) break;
    if (onProgress) onProgress(pageNum - 1, totalPages);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.8 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      let canvasThumbnail = '';
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        canvasThumbnail = canvas.toDataURL('image/jpeg', 0.85);
      }
      
      canvas.width = 0;
      canvas.height = 0;

      results.push({
        pageNumber: pageNum,
        pageIndex: pageNum - 1,
        canvasThumbnail,
        originalRotation: originalRotations[pageNum - 1] || 0,
        rotation: 0, // initially 0 added rotation
      });
    } catch (err) {
      console.warn(`Error loading page ${pageNum} preview:`, err);
      results.push({
        pageNumber: pageNum,
        pageIndex: pageNum - 1,
        canvasThumbnail: '',
        originalRotation: originalRotations[pageNum - 1] || 0,
        rotation: 0,
      });
    }
  }

  if (onProgress) onProgress(totalPages, totalPages);
  return results;
}

/**
 * Apply rotations to pages and return modified PDF bytes
 */
export async function rotatePdfPages(
  file: File,
  rotations: { pageNumber: number; rotation: number }[]
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  for (const item of rotations) {
    const pageIndex = item.pageNumber - 1;
    const page = pdfDoc.getPage(pageIndex);
    // Visual orientation is: originalRotation + userRotation
    // Set absolute rotation to this sum modulo 360
    const finalAngle = (item.rotation) % 360;
    page.setRotation(degrees(finalAngle));
  }

  return await pdfDoc.save();
}

