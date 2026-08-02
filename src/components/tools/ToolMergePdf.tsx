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
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-800 shadow-md transition-all"
      >
        <ArrowLeft className="w-4 h-4 text-indigo-400" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-3xl p-8 shadow-2xl flex items-center justify-between relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
            <Layers className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">Gộp Nhiều File PDF</h2>
            <p className="text-sm text-indigo-100 font-medium mt-1">
              Kéo thả sắp xếp thứ tự và hợp nhất nhiều file PDF thành một tài liệu duy nhất.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`glass-card rounded-3xl p-10 border-2 border-dashed transition-all duration-300 text-center space-y-5 ${
          isDragOver ? 'border-purple-400 bg-purple-950/20 scale-[1.01]' : 'border-slate-800 hover:border-purple-500/50 hover:shadow-2xl'
        }`}>
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto text-purple-400 border border-purple-500/30 shadow-inner">
          <Upload className="w-9 h-9" />
        </div>
        <div>
          <h3 className="font-black text-xl text-white tracking-tight">
            Kéo thả nhiều file PDF vào đây để gộp
          </h3>
          <p className="text-xs text-slate-400 mt-1">
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
          <span className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold cursor-pointer shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 transition-all inline-flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Thêm File PDF</span>
          </span>
        </label>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="glass-card rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
            <h3 className="font-bold text-sm text-white">
              Thứ tự gộp ({items.length} tệp • Tổng {totalPagesSum} trang)
            </h3>
            <button
              onClick={() => {
                setItems([]);
                setResultBlob(null);
              }}
              className="text-xs text-rose-400 hover:underline font-semibold"
            >
              Xóa danh sách
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 relative z-10">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 flex items-center justify-between gap-4 text-sm shadow-sm hover:border-purple-500/40 transition-all"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-black flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                    {idx + 1}
                  </span>
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl flex-shrink-0 border border-indigo-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-white truncate">
                      {item.file.name}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.pageCount} trang
                    </p>
                  </div>
                </div>

                {/* Move Controls & Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Chuyển lên"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === items.length - 1}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Chuyển xuống"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Xóa tệp này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between relative z-10">
            {resultBlob ? (
              <button
                onClick={() => downloadBlob(resultBlob, 'PDFPro_GopDocument.pdf')}
                className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center space-x-2 animate-bounce"
              >
                <Download className="w-5 h-5" />
                <span>Tải File Đã Gộp</span>
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleStartMerge}
              disabled={progress.isProcessing || items.length < 2}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-500/25 active:scale-95 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <Layers className="w-5 h-5" />
              <span>Bắt Đầu Gộp</span>
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

