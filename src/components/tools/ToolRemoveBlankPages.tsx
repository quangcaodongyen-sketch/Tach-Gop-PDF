import React, { useState } from 'react';
import { Upload, Eraser, FileText, Download, ArrowLeft, CheckCircle, AlertTriangle, Eye, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { detectBlankPages, removePagesFromPdf } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/zipUtils';
import { BlankPageInfo, ProcessingProgress } from '../../types';
import { BatchProgressBar } from '../BatchProgressBar';

interface ToolRemoveBlankPagesProps {
  onBack: () => void;
}

export const ToolRemoveBlankPages: React.FC<ToolRemoveBlankPagesProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageInfos, setPageInfos] = useState<BlankPageInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const cancelledRef = React.useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (selected: File) => {
    setFile(selected);
    setResultBlob(null);
    setPageInfos([]);

    setIsScanning(true);
    setScanProgress(0);
    cancelledRef.current = false;

    try {
      const detected = await detectBlankPages(selected, (processed, total) => {
        setScanProgress(Math.round((processed / total) * 100));
      }, cancelledRef);
      if (!cancelledRef.current) {
        setPageInfos(detected);
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        alert('Không thể quét trang trắng: ' + err.message);
      }
    } finally {
      if (!cancelledRef.current) setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    handleFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        handleFile(f);
      }
    }
  };

  const handleCancelScan = () => {
    cancelledRef.current = true;
    setIsScanning(false);
    setFile(null);
  };

  const handleToggleSelectPage = (pageNumber: number) => {
    setPageInfos((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selectedForDeletion: !p.selectedForDeletion } : p
      )
    );
  };

  const handleSelectAllBlank = () => {
    setPageInfos((prev) =>
      prev.map((p) => ({
        ...p,
        selectedForDeletion: p.isBlank,
      }))
    );
  };

  const handleClearAllSelections = () => {
    setPageInfos((prev) =>
      prev.map((p) => ({
        ...p,
        selectedForDeletion: false,
      }))
    );
  };

  const handleExportCleanPdf = async () => {
    if (!file) return;
    const pagesToDelete = pageInfos
      .filter((p) => p.selectedForDeletion)
      .map((p) => p.pageNumber);

    if (pagesToDelete.length === 0) {
      alert('Bạn chưa chọn trang nào để xóa.');
      return;
    }

    try {
      const cleanPdfBytes = await removePagesFromPdf(file, pagesToDelete);
      const blob = new Blob([cleanPdfBytes], { type: 'application/pdf' });
      setResultBlob(blob);
      downloadBlob(blob, `${file.name.replace(/\.pdf$/i, '')}_da_xoa_trang.pdf`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa trang trắng');
    }
  };

  const blankCount = pageInfos.filter((p) => p.isBlank).length;
  const selectedCount = pageInfos.filter((p) => p.selectedForDeletion).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Eraser className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Xóa Trang Trắng PDF</h2>
            <p className="text-xs text-amber-100">
              Quét thông minh nội dung PDF, tự động nhận diện và xóa các trang trắng hoặc trống.
            </p>
          </div>
        </div>
      </div>

      {/* Upload File Zone */}
      {!file && (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`bg-white dark:bg-slate-800 rounded-2xl p-10 border-2 border-dashed transition-all text-center space-y-4 ${
            isDragOver ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-amber-300 dark:border-slate-700 hover:border-amber-500'
          }`}>
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Chọn tệp PDF cần quét trang trắng
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hệ thống sẽ xem trước từng trang và đánh dấu trang trắng
            </p>
          </div>
          <label className="inline-block">
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <span className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-amber-500/20 transition-all inline-flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Tải File PDF Lên</span>
            </span>
          </label>
        </div>
      )}

      {/* Scanning Progress */}
      {isScanning && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-md text-center space-y-4 relative">
          <button onClick={handleCancelScan} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500">
            <Square className="w-5 h-5" />
          </button>
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Đang quét phân tích toàn bộ trang ({scanProgress}%)...
          </h3>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden max-w-md mx-auto">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Page Thumbnails Preview Grid */}
      {file && !isScanning && pageInfos.length > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Kết quả quét: {pageInfos.length} trang
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phát hiện <span className="font-bold text-amber-600 dark:text-amber-400">{blankCount} trang trắng</span>. Đã chọn xóa <span className="font-bold text-rose-600">{selectedCount} trang</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAllBlank}
                className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Chọn tất cả trang trắng</span>
              </button>

              <button
                onClick={handleClearAllSelections}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Bỏ chọn tất cả
              </button>

              <button
                onClick={handleExportCleanPdf}
                disabled={selectedCount === 0}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Xuất PDF Đã Xóa ({selectedCount})</span>
              </button>

              <label className="cursor-pointer">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <span className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline">
                  Đổi File
                </span>
              </label>
            </div>
          </div>

          {/* Grid view of pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pageInfos.map((p) => (
              <div
                key={p.pageNumber}
                onClick={() => handleToggleSelectPage(p.pageNumber)}
                className={`group relative bg-white dark:bg-slate-800 rounded-xl border-2 p-2.5 cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md ${
                  p.selectedForDeletion
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/30'
                    : p.isBlank
                    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                {/* Page Number & Checkbox Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Trang {p.pageNumber}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      p.selectedForDeletion
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {p.selectedForDeletion && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Thumbnail Image */}
                <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                  {p.canvasThumbnail ? (
                    <img
                      src={p.canvasThumbnail}
                      alt={`Trang ${p.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-400" />
                  )}

                  {/* Deletion Overlay */}
                  {p.selectedForDeletion && (
                    <div className="absolute inset-0 bg-rose-900/40 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider">
                      Sẽ Xóa
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mt-2 text-center">
                  {p.isBlank ? (
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Trang Trắng
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Có Nội Dung
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
