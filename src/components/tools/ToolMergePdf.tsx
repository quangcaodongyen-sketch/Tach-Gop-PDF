import React, { useState } from 'react';
import { Upload, Layers, FileText, Download, Trash2, ArrowLeft, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import { mergePdfs, getPdfPageCount } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/zipUtils';
import { BatchProgressBar } from '../BatchProgressBar';
import { ProcessingProgress } from '../../types';

interface ToolMergePdfProps {
  onBack: () => void;
}

interface MergeItem {
  id: string;
  file: File;
  pageCount: number;
}

export const ToolMergePdf: React.FC<ToolMergePdfProps> = ({ onBack }) => {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const cancelledRef = React.useRef(false);
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
    const uploaded = filesToProcess.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    const newItems: MergeItem[] = [];
    for (const f of uploaded) {
      try {
        const count = await getPdfPageCount(f);
        newItems.push({
          id: `${f.name}_${Date.now()}_${Math.random()}`,
          file: f,
          pageCount: count,
        });
      } catch (err) {
        newItems.push({
          id: `${f.name}_${Date.now()}_${Math.random()}`,
          file: f,
          pageCount: 1,
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartMerge = async () => {
    if (items.length < 2) {
      alert('Vui lòng chọn ít nhất 2 file PDF để gộp.');
      return;
    }

    setProgress({
      currentFileIndex: 0,
      totalFiles: items.length,
      currentFileName: items[0].file.name,
      percentage: 0,
      statusText: 'Đang gộp các tệp PDF...',
      isProcessing: true,
      isCancelled: false,
    });
    cancelledRef.current = false;

    try {
      const filesList = items.map((it) => it.file);
      const mergedBytes = await mergePdfs(filesList, (curr, total) => {
        setProgress((prev) => {
          if (prev.isCancelled) cancelledRef.current = true;
          return {
            ...prev,
            currentFileIndex: curr,
            totalFiles: total,
            currentFileName: curr < total ? filesList[curr].name : 'Hoàn tất',
            percentage: Math.round((curr / total) * 100),
            statusText: `Đang xử lý tệp ${curr}/${total}...`,
          };
        });
      }, cancelledRef);

      if (cancelledRef.current) return;

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      setResultBlob(blob);

      setProgress({
        currentFileIndex: items.length,
        totalFiles: items.length,
        currentFileName: '',
        percentage: 100,
        statusText: 'Đã gộp PDF thành công!',
        isProcessing: false,
        isCancelled: false,
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gộp file PDF');
      setProgress((p) => ({ ...p, isProcessing: false }));
    }
  };

  const totalPagesSum = items.reduce((sum, item) => sum + item.pageCount, 0);

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
      <div className="bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Gộp Nhiều File PDF</h2>
            <p className="text-xs text-blue-100">
              Kéo thả thay đổi thứ tự tài liệu, nhấn "Gộp PDF" để hợp nhất thành 1 file duy nhất.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 border-dashed transition-all text-center space-y-4 ${
          isDragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-indigo-300 dark:border-slate-700 hover:border-indigo-500'
        }`}>
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
          <Upload className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Kéo thả nhiều file PDF vào đây để gộp
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Có thể chọn và sắp xếp danh sách linh hoạt
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
          <span className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-indigo-500/20 transition-all inline-flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Thêm File PDF</span>
          </span>
        </label>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Thứ tự gộp ({items.length} tệp - Tổng {totalPagesSum} trang)
            </h3>
            <button
              onClick={() => {
                setItems([]);
                setResultBlob(null);
              }}
              className="text-xs text-rose-500 hover:underline font-semibold"
            >
              Xóa danh sách
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {item.file.name}
                    </p>
                    <p className="text-slate-400">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.pageCount} trang
                    </p>
                  </div>
                </div>

                {/* Move Controls & Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Chuyển lên"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === items.length - 1}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Chuyển xuống"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Xóa tệp này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            {resultBlob ? (
              <button
                onClick={() => downloadBlob(resultBlob, 'PDFPro_GopDocument.pdf')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center space-x-2 animate-bounce"
              >
                <Download className="w-4 h-4" />
                <span>Tải File PDF Đã Gộp</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleStartMerge}
              disabled={progress.isProcessing || items.length < 2}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 active:scale-98 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Layers className="w-4 h-4" />
              <span>Gộp PDF Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <BatchProgressBar
        progress={progress}
        onCancel={() => setProgress((p) => ({ ...p, isProcessing: false, isCancelled: true }))}
        completedCount={resultBlob ? 1 : 0}
        hasResults={resultBlob !== null}
      />
    </div>
  );
};
