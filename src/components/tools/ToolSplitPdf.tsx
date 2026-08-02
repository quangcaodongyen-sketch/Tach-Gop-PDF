import React, { useState } from 'react';
import { Upload, Scissors, FileText, Download, Trash2, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { splitPdf, getPdfPageCount } from '../../utils/pdfUtils';
import { downloadBlob, createZipArchive } from '../../utils/zipUtils';
import { BatchProgressBar } from '../BatchProgressBar';
import { ProcessingProgress } from '../../types';

interface ToolSplitPdfProps {
  onBack: () => void;
}

interface SplitItem {
  id: string;
  file: File;
  pageCount: number;
  rangeInput: string;
  resultBlob?: Blob;
  resultFileName?: string;
  error?: string;
}

export const ToolSplitPdf: React.FC<ToolSplitPdfProps> = ({ onBack }) => {
  const [items, setItems] = useState<SplitItem[]>([]);
  const [globalRange, setGlobalRange] = useState('1-3');
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

  const handleFiles = async (filesToProcess: File[]) => {
    const uploadedFiles = filesToProcess.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    const newItems: SplitItem[] = [];
    for (const f of uploadedFiles) {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        const count = await getPdfPageCount(f);
        newItems.push({
          id,
          file: f,
          pageCount: count,
          rangeInput: count > 1 ? `1-${Math.min(count, 3)}` : '1',
        });
      } catch (err) {
        newItems.push({
          id,
          file: f,
          pageCount: 1,
          rangeInput: '1',
          error: 'Khởi tạo file thất bại',
        });
      }
    }

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

  const handleApplyGlobalRange = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        rangeInput: globalRange,
      }))
    );
  };

  const handleItemRangeChange = (index: number, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index].rangeInput = val;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartSplit = async () => {
    if (items.length === 0) return;

    setProgress({
      currentFileIndex: 0,
      totalFiles: items.length,
      currentFileName: items[0].file.name,
      percentage: 0,
      statusText: 'Đang bắt đầu tách trang...',
      isProcessing: true,
      isCancelled: false,
    });

    const updatedItems = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      // Check if user cancelled
      let isCancelled = false;
      setProgress((currentProgress) => {
        isCancelled = currentProgress.isCancelled;
        return currentProgress;
      });
      if (isCancelled) break;

      const item = updatedItems[i];
      setProgress({
        currentFileIndex: i,
        totalFiles: updatedItems.length,
        currentFileName: item.file.name,
        percentage: Math.round((i / updatedItems.length) * 100),
        statusText: `Đang tách trang ${item.rangeInput}...`,
        isProcessing: true,
        isCancelled: false,
      });

      try {
        const pdfBytes = await splitPdf(item.file, item.rangeInput);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const cleanName = item.file.name.replace(/\.pdf$/i, '');
        const outName = `${cleanName}_tach_trang.pdf`;

        updatedItems[i] = {
          ...item,
          resultBlob: blob,
          resultFileName: outName,
          error: undefined,
        };
      } catch (err: any) {
        updatedItems[i] = {
          ...item,
          error: err.message || 'Lỗi tách trang PDF',
        };
      }

      setItems([...updatedItems]);
    }

    setProgress((prev) => {
      if (prev.isCancelled) return prev;
      return {
        currentFileIndex: updatedItems.length,
        totalFiles: updatedItems.length,
        currentFileName: '',
        percentage: 100,
        statusText: 'Đã tách trang hoàn tất!',
        isProcessing: false,
        isCancelled: false,
      };
    });
  };

  const handleDownloadZip = async () => {
    const validResults = items
      .filter((it) => it.resultBlob && it.resultFileName)
      .map((it) => ({
        name: it.resultFileName!,
        blob: it.resultBlob!,
      }));

    if (validResults.length === 0) return;
    const zipBlob = await createZipArchive(validResults);
    downloadBlob(zipBlob, 'PDFPro_TachTrang.zip');
  };

  const completedCount = items.filter((it) => it.resultBlob).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Tool Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Tách Trang PDF</h2>
            <p className="text-xs text-blue-100">
              Nhập trang lẻ (1,3,5) hoặc khoảng trang (1-10) để trích xuất file PDF mới.
            </p>
          </div>
        </div>
      </div>

      {/* File Drag & Drop Upload Zone */}
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
            Kéo thả tệp PDF vào đây hoặc chọn từ máy tính
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hỗ trợ chọn nhiều file PDF cùng lúc
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

      {/* Global Range Quick Setter */}
      {items.length > 1 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Áp dụng khoảng trang chung cho tất cả file đã chọn:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={globalRange}
              onChange={(e) => setGlobalRange(e.target.value)}
              placeholder="Ví dụ: 1-5, 8, 10"
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium w-36 text-slate-900 dark:text-white"
            />
            <button
              onClick={handleApplyGlobalRange}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Áp Dụng Tất Cả
            </button>
          </div>
        </div>
      )}

      {/* File List */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
            <span>Danh sách tệp tin ({items.length})</span>
            <button
              onClick={() => setItems([])}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Xóa tất cả
            </button>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-96 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3 min-w-[200px] flex-1">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {item.file.name}
                    </p>
                    <p className="text-slate-400">
                      Tổng số: <span className="font-bold text-slate-700 dark:text-slate-300">{item.pageCount} trang</span>
                    </p>
                  </div>
                </div>

                {/* Range Input */}
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Trang tách:</span>
                  <input
                    type="text"
                    value={item.rangeInput}
                    onChange={(e) => handleItemRangeChange(idx, e.target.value)}
                    placeholder="e.g. 1, 3, 5-10"
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-blue-600 dark:text-blue-400 w-32 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action / Result */}
                <div className="flex items-center space-x-2">
                  {item.resultBlob && item.resultFileName && (
                    <button
                      onClick={() => downloadBlob(item.resultBlob!, item.resultFileName!)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold flex items-center space-x-1 hover:bg-emerald-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải Về</span>
                    </button>
                  )}
                  {item.error && (
                    <span className="text-rose-500 font-semibold">{item.error}</span>
                  )}
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Start Process Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              onClick={handleStartSplit}
              disabled={progress.isProcessing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 active:scale-98 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Scissors className="w-4 h-4" />
              <span>Tách PDF Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
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
