import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

// Ensure worker is set
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface CellItem {
  text: string;
  x: number;
  y: number;
}

/**
 * Parse a numeric string supporting Vietnamese number format (1.234,56 → 1234.56)
 * Also handles standard format (1,234.56 → 1234.56)
 */
function parseVietnameseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Check if it's a Vietnamese format number (uses dot as thousands sep, comma as decimal)
  // e.g., 1.234.567,89
  const vnPattern = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
  if (vnPattern.test(trimmed)) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    if (!isNaN(num)) return num;
  }

  // Check standard international format (comma as thousands sep, dot as decimal)
  // e.g., 1,234,567.89
  const intlPattern = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
  if (intlPattern.test(trimmed)) {
    const normalized = trimmed.replace(/,/g, '');
    const num = Number(normalized);
    if (!isNaN(num)) return num;
  }

  // Simple number without separators
  const simplePattern = /^-?\d+(\.\d+)?$/;
  if (simplePattern.test(trimmed)) {
    return Number(trimmed);
  }

  // Percentage
  const pctPattern = /^-?\d+([.,]\d+)?%$/;
  if (pctPattern.test(trimmed)) {
    const numStr = trimmed.replace('%', '').replace(',', '.');
    const num = Number(numStr);
    if (!isNaN(num)) return num / 100;
  }

  return null;
}

/**
 * Convert PDF tables into Excel (.xlsx) workbook
 */
export async function convertPdfToExcel(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const workbook = XLSX.utils.book_new();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(Math.round(((pageNum - 1) / numPages) * 90));

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const cellItems: CellItem[] = textContent.items
      .map((item: any) => {
        const transform = item.transform;
        return {
          text: (item.str || '').trim(),
          x: Math.round(transform[4]),
          y: Math.round(viewport.height - transform[5]), // Top-down y
        };
      })
      .filter((it) => it.text.length > 0);

    // Group items by Y coordinate (row clustering within 8px tolerance — increased from 5)
    const Y_TOLERANCE = 8;
    const rowMap: { [y: number]: CellItem[] } = {};

    for (const item of cellItems) {
      let matchedY: number | null = null;
      for (const existingYStr of Object.keys(rowMap)) {
        const existingY = parseFloat(existingYStr);
        if (Math.abs(item.y - existingY) <= Y_TOLERANCE) {
          matchedY = existingY;
          break;
        }
      }

      if (matchedY !== null) {
        rowMap[matchedY].push(item);
      } else {
        rowMap[item.y] = [item];
      }
    }

    // Sort row Ys from top to bottom
    const sortedRowYs = Object.keys(rowMap)
      .map(Number)
      .sort((a, b) => a - b);

    // Collect all distinct X column boundaries across the page (increased tolerance from 15 to 25)
    const allXs = cellItems.map((it) => it.x).sort((a, b) => a - b);
    const X_TOLERANCE = 25;
    const columnXs: number[] = [];

    for (const x of allXs) {
      if (!columnXs.some((colX) => Math.abs(colX - x) <= X_TOLERANCE)) {
        columnXs.push(x);
      }
    }
    columnXs.sort((a, b) => a - b);

    // Build 2D matrix
    const tableData: (string | number)[][] = [];

    for (const y of sortedRowYs) {
      const lineItems = rowMap[y].sort((a, b) => a.x - b.x);
      const rowArray: (string | number)[] = new Array(columnXs.length).fill('');

      for (const item of lineItems) {
        // Find closest column index
        let bestColIdx = 0;
        let minDiff = Infinity;
        columnXs.forEach((colX, idx) => {
          const diff = Math.abs(item.x - colX);
          if (diff < minDiff) {
            minDiff = diff;
            bestColIdx = idx;
          }
        });

        const currentVal = rowArray[bestColIdx];
        if (currentVal) {
          rowArray[bestColIdx] = `${currentVal} ${item.text}`;
        } else {
          // Try parse as number (supports Vietnamese format)
          const num = parseVietnameseNumber(item.text);
          if (num !== null) {
            rowArray[bestColIdx] = num;
          } else {
            rowArray[bestColIdx] = item.text;
          }
        }
      }

      if (rowArray.some((val) => val !== '')) {
        tableData.push(rowArray);
      }
    }

    if (tableData.length === 0) {
      tableData.push(['(Trang này không chứa dữ liệu dạng bảng)']);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(tableData);
    
    // Auto-size columns
    const colWidths = columnXs.map((_, colIdx) => {
      let maxLen = 8;
      for (const row of tableData) {
        const cellLen = String(row[colIdx] || '').length;
        if (cellLen > maxLen) maxLen = cellLen;
      }
      return { wch: Math.min(maxLen + 2, 50) };
    });
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, `Trang ${pageNum}`);
  }

  if (onProgress) onProgress(95);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  if (onProgress) onProgress(100);

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Convert Excel (.xlsx / .xls) file to PDF with high fidelity & Vietnamese Unicode.
 * Uses proper page splitting to avoid cutting tables mid-row.
 */
export async function convertExcelToPdf(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  if (onProgress) onProgress(10);
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (onProgress) onProgress(30);

  // Convert sheets to HTML tables
  let combinedHtml = '';
  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    const htmlTable = XLSX.utils.sheet_to_html(sheet);

    combinedHtml += `
      <div style="margin-bottom: 32px;">
        <h2 style="font-size: 16px; font-weight: bold; color: #047857; margin-bottom: 12px;">Sheet: ${sheetName}</h2>
        ${htmlTable}
      </div>
    `;
  }

  if (onProgress) onProgress(50);

  // A4 Landscape dimensions
  const A4_L_WIDTH_PX = 1123;
  const A4_L_HEIGHT_PX = 794;
  const PADDING_PX = 40;

  // Render HTML in offscreen container with landscape A4 dimensions
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${A4_L_WIDTH_PX}px`;
  container.style.padding = `${PADDING_PX}px`;
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = '"Times New Roman", Arial, "Segoe UI", system-ui, sans-serif';
  container.style.fontSize = '12px';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
      tr:nth-child(even) { background-color: #f8fafc; }
      tr:first-child td, tr:first-child th { background-color: #ecfdf5; font-weight: bold; color: #065f46; }
    </style>
    <div>${combinedHtml}</div>
  `;

  document.body.appendChild(container);

  if (onProgress) onProgress(70);

  const totalHeight = container.scrollHeight;

  const fullCanvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    height: totalHeight,
    windowHeight: totalHeight,
  });

  document.body.removeChild(container);

  if (onProgress) onProgress(85);

  const pdfDoc = await PDFDocument.create();
  const A4_LANDSCAPE_WIDTH = 841.89;
  const A4_LANDSCAPE_HEIGHT = 595.28;

  // Split into A4 landscape pages by slicing the full canvas
  const canvasWidthPx = fullCanvas.width;
  const canvasHeightPx = fullCanvas.height;
  const scaleFactor = canvasWidthPx / A4_L_WIDTH_PX;
  const pageHeightPx = Math.floor(A4_L_HEIGHT_PX * scaleFactor);

  let yOffset = 0;
  let pageIndex = 0;
  const totalPdfPages = Math.ceil(canvasHeightPx / pageHeightPx);

  while (yOffset < canvasHeightPx) {
    const sliceHeight = Math.min(pageHeightPx, canvasHeightPx - yOffset);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidthPx;
    pageCanvas.height = pageHeightPx;
    const pageCtx = pageCanvas.getContext('2d')!;

    // White background
    pageCtx.fillStyle = '#ffffff';
    pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    // Draw the slice from the full canvas
    pageCtx.drawImage(
      fullCanvas,
      0, yOffset, canvasWidthPx, sliceHeight,
      0, 0, canvasWidthPx, sliceHeight
    );

    const pageDataUrl = pageCanvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(pageDataUrl);

    const page = pdfDoc.addPage([A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: A4_LANDSCAPE_WIDTH,
      height: A4_LANDSCAPE_HEIGHT,
    });

    // Cleanup
    pageCanvas.width = 0;
    pageCanvas.height = 0;

    yOffset += pageHeightPx;
    pageIndex++;

    if (onProgress) {
      onProgress(85 + Math.round((pageIndex / totalPdfPages) * 13));
    }
  }

  // Cleanup
  fullCanvas.width = 0;
  fullCanvas.height = 0;

  if (onProgress) onProgress(100);
  return await pdfDoc.save();
}
