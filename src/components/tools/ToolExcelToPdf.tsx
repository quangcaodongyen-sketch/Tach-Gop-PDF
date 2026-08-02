import React, { useState } from 'react';
import { Upload, TableProperties, Download, Trash2, ArrowLeft } from 'lucide-react';
import { convertExcelToPdf } from '../../utils/excelUtils';
import { downloadBlob, createZipArchive } from '../../utils/zipUtils';
import { BatchProgressBar } from '../BatchProgressBar';
import { ProcessingProgress } from '../../types';

interface ToolExcelToPdfProps {
  onBack: () => void;
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

export const ToolExcelToPdf: React.FC<ToolExcelToPdfProps> = ({ onBack }) => {
  const [items, setItems] = useState<ConvertItem[]>([]);
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
      (f) =>
        f.name.toLowerCase().endsWith('.xlsx') ||
        f.name.toLowerCase().endsWith('.xls') ||
        f.type.includes('spreadsheet') ||
        f.type.includes('excel')
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
      statusText: 'Bắt đầu chuyển Excel sang PDF...',
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
        statusText: `Đang định dạng bảng Excel vừa khổ giấy...`,
        isProcessing: true,
        isCancelled: false,
      });

      try {
        const pdfBytes = await convertExcelToPdf(item.file, (itemProgress) => {
          updated[i].progress = itemProgress;
          setItems([...updated]);
        });

        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const outName = `${item.file.name.replace(/\.(xlsx|xls)$/i, '')}.pdf`;

        updated[i] = {
          ...item,
          status: 'done',
          progress: 100,
          resultBlob: pdfBlob,
          resultFileName: outName,
        };
      } catch (err: any) {
        updated[i] = {
          ...item,
          status: 'error',
          error: err.message || 'Lỗi chuyển đổi Excel sang PDF',
        };
      }

      setItems([...updated]);
    }

    setProgress((prev) => {
      if (prev.isCancelled) return prev;
      return {
        ...prev,
        currentFileIndex: updated.length,
        totalFiles: updated.length,
        currentFileName: '',
        percentage: 100,
        statusText: 'Chuyển Excel sang PDF hoàn tất!',
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
    downloadBlob(zip, 'PDFPro_ExcelSangPDF.zip');
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
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <TableProperties className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Chuyển Excel Sang PDF</h2>
            <p className="text-xs text-emerald-100">
              Hỗ trợ XLS và XLSX. Giữ nguyên giá trị công thức, màu sắc ô, căn chỉnh lề và khổ giấy.
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
          isDragOver ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' : 'border-emerald-300 dark:border-slate-700 hover:border-emerald-500'
        }`}>
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
          <Upload className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Kéo thả tệp Excel (.xls, .xlsx) vào đây
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hỗ trợ chọn nhiều file để xuất PDF cùng lúc
          </p>
        </div>
        <label className="inline-block">
          <input
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <span className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-500/20 transition-all inline-flex items-center space-x-2">
            <TableProperties className="w-4 h-4" />
            <span>Chọn Tệp Excel</span>
          </span>
        </label>
      </div>

      {/* File List */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Tệp Excel ({items.length})
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
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                    <TableProperties className="w-5 h-5" />
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
                      <span>Tải PDF</span>
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
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 active:scale-98 disabled:opacity-50 transition-all flex items-center space-x-2"
            >
              <TableProperties className="w-4 h-4" />
              <span>Xuất PDF Ngay</span>
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
