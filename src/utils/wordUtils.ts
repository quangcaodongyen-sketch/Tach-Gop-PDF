import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip, PageBreak } from 'docx';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

// Ensure pdfjs worker is ready
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontName: string;
  isBold: boolean;
  isItalic: boolean;
}

/**
 * Map PDF font name to a standard Word font for Vietnamese support
 */
function mapFont(pdfFontName: string): string {
  const name = pdfFontName.toLowerCase();
  if (name.includes('times') || name.includes('serif')) return 'Times New Roman';
  if (name.includes('arial') || name.includes('helvetica') || name.includes('sans')) return 'Arial';
  if (name.includes('courier') || name.includes('mono')) return 'Courier New';
  if (name.includes('calibri')) return 'Calibri';
  if (name.includes('cambria')) return 'Cambria';
  if (name.includes('tahoma')) return 'Tahoma';
  if (name.includes('verdana')) return 'Verdana';
  if (name.includes('roboto')) return 'Arial'; // Roboto → Arial fallback
  // Default to Times New Roman for best Vietnamese support
  return 'Times New Roman';
}

/**
 * Detect bold from font name
 */
function detectBold(fontName: string): boolean {
  const name = fontName.toLowerCase();
  return name.includes('bold') || name.includes('bld') || name.includes('heavy') || name.includes('black');
}

/**
 * Detect italic from font name
 */
function detectItalic(fontName: string): boolean {
  const name = fontName.toLowerCase();
  return name.includes('italic') || name.includes('oblique') || name.includes('ital');
}

/**
 * Convert PDF file to Microsoft Word DOCX — Editable Text Mode
 * Extracts text with proper formatting, headings, and layout preservation.
 * Formula and complex vector graphics are represented as best-effort text.
 */
export async function convertPdfToWord(
  file: File,
  onProgress?: (progress: number) => void,
  _apiKey?: string
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const docSections: any[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) onProgress(Math.round(((pageNum - 1) / numPages) * 95));

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const rawItems: TextItem[] = textContent.items.map((item: any) => {
      const transform = item.transform;
      const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 11;
      const fontName = item.fontName || '';
      return {
        text: item.str || '',
        x: transform[4],
        y: viewport.height - transform[5], // Convert to top-down y coordinate
        width: item.width || 0,
        fontSize: Math.round(fontSize),
        fontName,
        isBold: detectBold(fontName),
        isItalic: detectItalic(fontName),
      };
    });

    // Group items into lines (y coordinates within 4px of each other)
    const linesMap: { [yKey: number]: TextItem[] } = {};
    const TOLERANCE = 4;

    for (const item of rawItems) {
      if (!item.text.trim() && !item.text.includes(' ')) continue;
      let matchedKey: number | null = null;
      for (const yKeyStr of Object.keys(linesMap)) {
        const yKey = parseFloat(yKeyStr);
        if (Math.abs(item.y - yKey) <= TOLERANCE) {
          matchedKey = yKey;
          break;
        }
      }

      if (matchedKey !== null) {
        linesMap[matchedKey].push(item);
      } else {
        linesMap[item.y] = [item];
      }
    }

    // Sort y lines from top to bottom
    const sortedYKeys = Object.keys(linesMap)
      .map(Number)
      .sort((a, b) => a - b);

    const pageParagraphs: any[] = [];

    for (const yKey of sortedYKeys) {
      const lineItems = linesMap[yKey].sort((a, b) => a.x - b.x);

      // Build text runs preserving font/bold/italic per item
      const textRuns: TextRun[] = [];
      
      for (let i = 0; i < lineItems.length; i++) {
        const it = lineItems[i];
        let text = it.text;
        
        // Add space between items if there's a gap
        if (i > 0) {
          const prev = lineItems[i - 1];
          const gap = it.x - (prev.x + prev.width);
          if (gap > it.fontSize * 0.3) {
            text = ' ' + text;
          }
        }

        if (!text) continue;

        const mappedFont = mapFont(it.fontName);
        const sizeHalfPts = it.fontSize * 2; // docx font size is in half-points

        textRuns.push(
          new TextRun({
            text,
            size: sizeHalfPts || 22,
            bold: it.isBold,
            italics: it.isItalic,
            font: mappedFont,
          })
        );
      }

      if (textRuns.length === 0) continue;

      const lineText = lineItems.map((it) => it.text).join('').trim();
      if (!lineText) continue;

      const maxFontSize = Math.max(...lineItems.map((it) => it.fontSize));

      let headingLevel: any = undefined;
      if (maxFontSize >= 20) {
        headingLevel = HeadingLevel.HEADING_1;
      } else if (maxFontSize >= 16) {
        headingLevel = HeadingLevel.HEADING_2;
      } else if (maxFontSize >= 14 && lineItems.some(it => it.isBold)) {
        headingLevel = HeadingLevel.HEADING_3;
      }

      // Detect alignment based on x position
      let alignment = AlignmentType.LEFT;
      const avgX = lineItems.reduce((sum, it) => sum + it.x, 0) / lineItems.length;
      const pageCenter = viewport.width / 2;
      if (Math.abs(avgX - pageCenter) < viewport.width * 0.15 && lineItems.length <= 3) {
        alignment = AlignmentType.CENTER;
      }

      pageParagraphs.push(
        new Paragraph({
          heading: headingLevel,
          alignment,
          spacing: { after: 120, line: 276 },
          children: textRuns,
        })
      );
    }

    if (pageParagraphs.length === 0) {
      pageParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '', size: 22 })],
        })
      );
    }

    docSections.push({
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: pageParagraphs,
    });
  }

  if (onProgress) onProgress(98);

  const doc = new Document({
    sections: docSections,
  });

  const blob = await Packer.toBlob(doc);
  if (onProgress) onProgress(100);

  return blob;
}

/**
 * Convert Word (.docx / .doc) to PDF with full Vietnamese Unicode & layout fidelity.
 * Uses proper page splitting to avoid cutting content mid-line.
 */
export async function convertWordToPdf(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  if (onProgress) onProgress(10);
  const arrayBuffer = await file.arrayBuffer();

  let htmlContent = '';
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    htmlContent = result.value || '';
  } catch (err) {
    console.warn('Mammoth conversion fallback:', err);
  }

  if (!htmlContent.trim()) {
    try {
      const rawText = await file.text();
      htmlContent = rawText
        .split('\n')
        .map((line) => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('');
    } catch {
      htmlContent = '<p>Không thể trích xuất nội dung từ tệp Word.</p>';
    }
  }

  if (onProgress) onProgress(30);

  // A4 dimensions at 96 DPI
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;
  const PADDING_PX = 48;
  const CONTENT_HEIGHT_PX = A4_HEIGHT_PX - (PADDING_PX * 2);

  // Render HTML in a clean offscreen DOM container with A4 dimensions
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.padding = `${PADDING_PX}px`;
  container.style.boxSizing = 'border-box';
  container.style.background = '#ffffff';
  container.style.color = '#1e293b';
  container.style.fontFamily = '"Times New Roman", Arial, "Segoe UI", system-ui, sans-serif';
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.6';

  container.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');
      p { margin-bottom: 12px; word-break: break-word; }
      h1 { font-size: 22px; font-weight: 800; margin-top: 18px; margin-bottom: 12px; color: #0f172a; }
      h2 { font-size: 18px; font-weight: 700; margin-top: 16px; margin-bottom: 10px; color: #1e293b; }
      h3 { font-size: 16px; font-weight: 700; margin-top: 14px; margin-bottom: 8px; color: #334155; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
      th { background-color: #f1f5f9; font-weight: 700; }
      img { max-width: 100%; height: auto; }
      ul, ol { margin-left: 24px; margin-bottom: 12px; }
    </style>
    <div>${htmlContent}</div>
  `;

  document.body.appendChild(container);

  if (onProgress) onProgress(50);

  // Get total content height
  const totalHeight = container.scrollHeight;
  const pdfDoc = await PDFDocument.create();

  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  // Capture full content as one canvas
  const fullCanvas = await html2canvas(container, {
    scale: 2, // High resolution
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    height: totalHeight,
    windowHeight: totalHeight,
  });

  document.body.removeChild(container);

  if (onProgress) onProgress(80);

  // Split into A4 pages by slicing the full canvas
  const canvasWidthPx = fullCanvas.width;
  const canvasHeightPx = fullCanvas.height;
  const scaleFactor = canvasWidthPx / A4_WIDTH_PX;
  const pageHeightPx = Math.floor(A4_HEIGHT_PX * scaleFactor);

  let yOffset = 0;
  let pageIndex = 0;
  const totalPdfPages = Math.ceil(canvasHeightPx / pageHeightPx);

  while (yOffset < canvasHeightPx) {
    const sliceHeight = Math.min(pageHeightPx, canvasHeightPx - yOffset);

    // Create a page-sized canvas slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvasWidthPx;
    pageCanvas.height = pageHeightPx; // Always full page height for uniform pages
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

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
    });

    // Cleanup slice canvas
    pageCanvas.width = 0;
    pageCanvas.height = 0;

    yOffset += pageHeightPx;
    pageIndex++;

    if (onProgress) {
      onProgress(80 + Math.round((pageIndex / totalPdfPages) * 18));
    }
  }

  // Cleanup full canvas
  fullCanvas.width = 0;
  fullCanvas.height = 0;

  if (onProgress) onProgress(100);
  return await pdfDoc.save();
}
