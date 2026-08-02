import JSZip from 'jszip';

interface ZipFileItem {
  name: string;
  blob: Blob | Uint8Array;
}

/**
 * Package multiple processed files into a single downloadable ZIP archive
 */
export async function createZipArchive(files: ZipFileItem[]): Promise<Blob> {
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Trigger browser file download
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
