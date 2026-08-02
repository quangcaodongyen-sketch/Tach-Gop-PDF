import React, { useState } from 'react';
import { Upload, FileText, Download, Trash2, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { convertPdfToWord } from '../../utils/wordUtils';
import { downloadBlob, createZipArchive } from '../../utils/zipUtils';
import { BatchProgressBar } from '../BatchProgressBar';
import { ProcessingProgress } from '../../types';

interface ToolPdfToWordProps {
  onBack: () => void;
  hasApiKey: boolean;
}

interface ConvertItem {
  id: string;
  file: File;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  resultBlob?: Blob;
  resultFileName?: string;
  error?: string;
}

export const ToolPdfToWord: React.FC<ToolPdfToWordProps> = ({ onBack, hasApiKey }) => {
  const [items, setItems] = useState<ConvertItem[]>([]);
  const [useAi, setUseAi] = useState<boolean>(hasApiKey);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    percentage: 0,
    statusText: '',
    isProcessing: false,
    isCancelled: false,
  });

  const handleFiles = (filesToProcess: File[]) => {
    const uploaded = filesToProcess.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    const newItems: ConvertItem[] = uploaded.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file: f,
      status: 'idle',
      progress: 0,
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartConversion = async () => {
    if (items.length === 0) return;

    setProgress({
      currentFileIndex: 0,
      totalFiles: items.length,
      currentFileName: items[0].file.name,
      percentage: 0,
      statusText: 'Bắt đầu chuyển đổi PDF sang Word...',
      isProcessing: true,
      isCancelled: false,
    });

    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      // Check cancellation
      let isCancelled = false;
      setProgress((currentProgress) => {
        isCancelled = currentProgress.isCancelled;
        return currentProgress;
      });
      if (isCancelled) break;

      const item = updated[i];
      updated[i] = { ...item, status: 'processing', progress: 10 };
      setItems([...updated]);

      setProgress({
        currentFileIndex: i,
        totalFiles: updated.length,
        currentFileName: item.file.name,
        percentage: Math.round((i / updated.length) * 100),
        statusText: `Đang trích xuất văn bản & cấu trúc Word...`,
        isProcessing: true,
        isCancelled: false,
      });

      try {
        const docxBlob = await convertPdfToWord(
          item.file,
          (itemProgress) => {
            updated[i].progress = itemProgress;
            setItems([...updated]);
          },
          useAi ? localStorage.getItem('pdfpro_gemini_api_key') || undefined : undefined
        );

        const outName = `${item.file.name.replace(/\.pdf$/i, '')}.docx`;
        updated[i] = {
          ...item,
          status: 'done',
          progress: 100,
          resultBlob: docxBlob,
          resultFileName: outName,
        };
      } catch (err: any) {
        updated[i] = {
          ...item,
          status: 'error',
          error: err.message || 'Lỗi chuyển đổi PDF sang Word',
        };
      }

      setItems([...updated]);
    }

    setProgress((prev) => {
      if (prev.isCancelled) return prev;
      return {
        currentFileIndex: updated.length,
        totalFiles: updated.length,
        currentFileName: '',
        percentage: 100,
        statusText: 'Hoàn tất chuyển đổi tất cả tệp tin!',
        isProcessing: false,
        isCancelled: false,
      };
    });
  };

  const handleDownloadZip = async () => {
    const valid = items
      .filter((it) => it.resultBlob && it.resultFileName)
      .map((it) => ({
        name: it.resultFileName!,
        blob: it.resultBlob!,
      }));

    if (valid.length === 0) return;
    const zip = await createZipArchive(valid);
    downloadBlob(zip, 'PDFPro_ChuyenDoiWord.zip');
  };

  const completedCount = items.filter((it) => it.resultBlob).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Chuyển PDF Sang Word (.docx)</h2>
            <p className="text-xs text-blue-100">
              Bảo lưu định dạng font chữ, bảng biểu, ảnh và font tiếng Việt Unicode không bị lỗi.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed transition-all text-center space-y-4 ${
          isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-blue-300 dark:border-slate-700 hover:border-blue-500'
        }`}>
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
          <Upload className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Kéo thả nhiều file PDF để chuyển sang Word
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hỗ trợ chuyển đổi hàng loạt tốc độ cao
          </p>
        </div>
        <label className="inline-block">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-blue-500/20 transition-all inline-flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Chọn File PDF</span>
          </span>
        </label>
      </div>

      {/* File List */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Tệp chuyển đổi ({items.length})
            </h3>
            <button
              onClick={() => setItems([])}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Xóa danh sách
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-96 overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {item.file.name}
                    </p>
                    <p className="text-slate-400">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {item.status === 'done' && item.resultBlob && (
                    <button
                      onClick={() => downloadBlob(item.resultBlob!, item.resultFileName!)}
                      className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold flex items-center space-x-1 hover:bg-emerald-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Word (.docx)</span>
                    </button>
                  )}
                  {item.error && (
                    <span className="text-rose-500 font-semibold">{item.error}</span>
                  )}
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              onClick={handleStartConversion}
              disabled={progress.isProcessing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Chuyển Sang Word Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <BatchProgressBar
        progress={progress}
        onCancel={() => setProgress((p) => ({ ...p, isProcessing: false, isCancelled: true }))}
        onDownloadZip={handleDownloadZip}
        completedCount={completedCount}
        hasResults={completedCount > 0}
      />
    </div>
  );
};
