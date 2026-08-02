import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Download, FileArchive } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface BatchProgressBarProps {
  progress: ProcessingProgress;
  onCancel: () => void;
  onDownloadZip?: () => void;
  completedCount: number;
  hasResults: boolean;
}

export const BatchProgressBar: React.FC<BatchProgressBarProps> = ({
  progress,
  onCancel,
  onDownloadZip,
  completedCount,
  hasResults,
}) => {
  if (!progress.isProcessing && !hasResults) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {progress.isProcessing ? (
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : progress.isCancelled ? (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {progress.isProcessing
                ? `Đang xử lý: ${progress.currentFileName || 'Tệp tin...'}`
                : progress.isCancelled
                ? 'Đã hủy tiến trình'
                : 'Hoàn tất chuyển đổi!'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {progress.isProcessing
                ? `Đang tiến hành (${progress.currentFileIndex + 1}/${progress.totalFiles}) - ${progress.statusText}`
                : `Thành công ${completedCount}/${progress.totalFiles} tệp tin`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm font-black text-blue-600 dark:text-blue-400">
            {progress.percentage}%
          </span>

          {progress.isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
              title="Hủy tiến trình đang chạy"
            >
              <XCircle className="w-4 h-4" />
              <span>Hủy</span>
            </button>
          )}

          {!progress.isProcessing && hasResults && onDownloadZip && (
            <button
              type="button"
              onClick={onDownloadZip}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2 animate-bounce"
            >
              <FileArchive className="w-4 h-4" />
              <span>Tải Tất Cả Dạng ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.isCancelled
              ? 'bg-amber-500'
              : progress.percentage === 100
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
        />
      </div>
    </div>
  );
};
