import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, XCircle, FileArchive } from 'lucide-react';
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
    <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          {progress.isProcessing ? (
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : progress.isCancelled ? (
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          <div>
            <h4 className="font-bold text-sm text-white">
              {progress.isProcessing
                ? `Đang xử lý: ${progress.currentFileName || 'Tệp tin...'}`
                : progress.isCancelled
                ? 'Đã hủy tiến trình'
                : 'Hoàn tất xử lý!'}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {progress.isProcessing
                ? `Đang tiến hành (${progress.currentFileIndex + 1}/${progress.totalFiles}) - ${progress.statusText}`
                : `Thành công ${completedCount}/${progress.totalFiles} tệp tin`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm font-black text-indigo-400">
            {progress.percentage}%
          </span>

          {progress.isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
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
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all flex items-center space-x-2 animate-bounce"
            >
              <FileArchive className="w-4 h-4" />
              <span>Tải Tất Cả Dạng ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.isCancelled
              ? 'bg-amber-500'
              : progress.percentage === 100
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
        />
      </div>
    </div>
  );
};

