import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface PdfPageRender {
  pageNumber: number;
  width: number;
  height: number;
  thumbnailDataUrl: string;
}

export interface TextAnnotation {
  id: string;
  pageIndex: number;
  x: number; // percentage of page width (0-100)
  y: number; // percentage of page height (0-100)
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
}

export interface ImageAnnotation {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface DrawAnnotation {
  id: string;
  pageIndex: number;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface WhiteoutAnnotation {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation = 
  | ({ type: 'text' } & TextAnnotation)
  | ({ type: 'image' } & ImageAnnotation)
  | ({ type: 'draw' } & DrawAnnotation)
  | ({ type: 'whiteout' } & WhiteoutAnnotation);

/**
 * Render all pages of a PDF to canvas thumbnails for preview
 */
export async function renderPdfPages(
  file: File,
  scale: number = 1.5,
  onProgress?: (current: number, total: number) => void
): Promise<PdfPageRender[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const results: PdfPageRender[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(pageNum - 1, numPages);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');

    results.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      thumbnailDataUrl: dataUrl,
    });

    // Cleanup
    canvas.width = 0;
    canvas.height = 0;
  }

  if (onProgress) onProgress(numPages, numPages);
  return results;
}

/**
 * Parse hex color to rgb values (0-1 range for pdf-lib)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Apply annotations to PDF and produce a new PDF
 */
export async function applyAnnotationsToPdf(
  file: File,
  annotations: Annotation[],
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  // Embed standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  if (onProgress) onProgress(20);

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];
    if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) continue;

    const page = pages[ann.pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    if (onProgress) {
      onProgress(20 + Math.round((i / annotations.length) * 70));
    }

    switch (ann.type) {
      case 'whiteout': {
        // Draw white rectangle to "erase" content
        const x = (ann.x / 100) * pageWidth;
        const y = pageHeight - ((ann.y / 100) * pageHeight) - ((ann.height / 100) * pageHeight);
        const w = (ann.width / 100) * pageWidth;
        const h = (ann.height / 100) * pageHeight;
        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: rgb(1, 1, 1),
        });
        break;
      }

      case 'text': {
        let font: PDFFont = helvetica;
        if (ann.bold && ann.italic) font = helveticaBoldOblique;
        else if (ann.bold) font = helveticaBold;
        else if (ann.italic) font = helveticaOblique;

        const { r, g, b } = hexToRgb(ann.color);
        const x = (ann.x / 100) * pageWidth;
        // PDF coordinate system: y starts from bottom
        const y = pageHeight - ((ann.y / 100) * pageHeight) - ann.fontSize;

        // Handle multi-line text
        const lines = ann.text.split('\n');
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const lineText = lines[lineIdx];
          if (!lineText.trim()) continue;
          
          // Try to draw text, falling back to basic ASCII if encoding fails
          try {
            page.drawText(lineText, {
              x,
              y: y - (lineIdx * (ann.fontSize + 4)),
              size: ann.fontSize,
              font,
              color: rgb(r, g, b),
            });
          } catch (err) {
            // If Unicode characters can't be encoded in Helvetica, draw what we can
            const asciiText = lineText.replace(/[^\x20-\x7E]/g, '?');
            page.drawText(asciiText, {
              x,
              y: y - (lineIdx * (ann.fontSize + 4)),
              size: ann.fontSize,
              font,
              color: rgb(r, g, b),
            });
          }
        }
        break;
      }

      case 'image': {
        try {
          const imageBytes = dataUrlToBytes(ann.dataUrl);
          const mimeType = ann.dataUrl.split(';')[0].split(':')[1];
          let image;
          if (mimeType === 'image/png') {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }

          const x = (ann.x / 100) * pageWidth;
          const y = pageHeight - ((ann.y / 100) * pageHeight) - ((ann.height / 100) * pageHeight);
          const w = (ann.width / 100) * pageWidth;
          const h = (ann.height / 100) * pageHeight;

          page.drawImage(image, { x, y, width: w, height: h });
        } catch (err) {
          console.warn('Failed to embed image annotation:', err);
        }
        break;
      }

      case 'draw': {
        if (ann.points.length < 2) break;
        const { r, g, b } = hexToRgb(ann.color);

        for (let j = 1; j < ann.points.length; j++) {
          const p1 = ann.points[j - 1];
          const p2 = ann.points[j];
          const x1 = (p1.x / 100) * pageWidth;
          const y1 = pageHeight - (p1.y / 100) * pageHeight;
          const x2 = (p2.x / 100) * pageWidth;
          const y2 = pageHeight - (p2.y / 100) * pageHeight;

          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness: ann.lineWidth,
            color: rgb(r, g, b),
          });
        }
        break;
      }
    }
  }

  if (onProgress) onProgress(95);
  const result = await pdfDoc.save();
  if (onProgress) onProgress(100);
  return result;
}

/**
 * Convert data URL to Uint8Array bytes
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
