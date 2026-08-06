export type ToolId = 
  | 'split' 
  | 'merge' 
  | 'remove-blank'
  | 'rotate';

export interface RotatePageInfo {
  pageNumber: number;
  pageIndex: number;
  canvasThumbnail: string;
  originalRotation: number;
  rotation: number; // 0, 90, 180, 270
}


export interface ToolMeta {
  id: ToolId;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  color: string;
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  pageCount?: number;
  previewUrl?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  resultBlob?: Blob;
  resultFileName?: string;
}

export interface BlankPageInfo {
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  isBlank: boolean;
  score: number; // 0 to 1, higher = blanker
  textLength: number;
  canvasThumbnail?: string;
  selectedForDeletion: boolean;
}

export interface ProcessingProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  percentage: number;
  statusText: string;
  isProcessing: boolean;
  isCancelled: boolean;
}
