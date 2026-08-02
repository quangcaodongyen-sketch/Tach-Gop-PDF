import React, { useState } from 'react';
import { Upload, Eraser, FileText, Download, ArrowLeft, CheckCircle, AlertTriangle, Eye, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { detectBlankPages, removePagesFromPdf } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/zipUtils';
import { BlankPageInfo } from '../../types';

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
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-800 shadow-md transition-all"
      >
        <ArrowLeft className="w-4 h-4 text-teal-400" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-3xl p-8 shadow-2xl flex items-center justify-between relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
            <Eraser className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">Xóa Trang Trắng PDF</h2>
            <p className="text-sm text-teal-100 font-medium mt-1">
              Phân tích mật độ điểm ảnh thông minh, tự động loại bỏ trang trắng rác.
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
          className={`glass-card rounded-3xl p-10 border-2 border-dashed transition-all duration-300 text-center space-y-5 ${
            isDragOver ? 'border-teal-400 bg-teal-950/20 scale-[1.01]' : 'border-slate-800 hover:border-teal-500/50 hover:shadow-2xl'
          }`}>
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-teal-400 border border-teal-500/30 shadow-inner">
            <Upload className="w-9 h-9" />
          </div>
          <div>
            <h3 className="font-black text-xl text-white tracking-tight">
              Chọn tệp PDF cần quét trang trắng
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống sẽ xem trước từng trang và tự động đánh dấu trang trắng
            </p>
          </div>
          <label className="inline-block">
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <span className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold cursor-pointer shadow-lg shadow-teal-500/25 hover:-translate-y-0.5 transition-all inline-flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Tải File PDF Lên</span>
            </span>
          </label>
        </div>
      )}

      {/* Scanning Progress */}
      {isScanning && (
        <div className="glass-card rounded-3xl p-8 shadow-2xl text-center space-y-5 relative overflow-hidden border border-slate-800">
          <button onClick={handleCancelScan} className="absolute top-4 right-4 text-slate-400 hover:text-rose-400 relative z-10 transition-colors">
            <Square className="w-6 h-6" />
          </button>
          <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mx-auto relative z-10" />
          <h3 className="font-black text-lg text-white relative z-10">
            Đang quét phân tích toàn bộ trang ({scanProgress}%)...
          </h3>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden max-w-md mx-auto relative z-10 shadow-inner border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Page Thumbnails Preview Grid */}
      {file && !isScanning && pageInfos.length > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="glass-card rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 relative z-10 border border-slate-800">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-white">
                Kết quả quét: {pageInfos.length} trang
              </h3>
              <p className="text-xs text-slate-400">
                Phát hiện <span className="font-bold text-amber-400">{blankCount} trang trắng</span>. Đã chọn xóa <span className="font-bold text-rose-400">{selectedCount} trang</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAllBlank}
                className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Chọn tất cả trang trắng</span>
              </button>

              <button
                onClick={handleClearAllSelections}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm border border-slate-800"
              >
                Bỏ chọn tất cả
              </button>

              <button
                onClick={handleExportCleanPdf}
                disabled={selectedCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-500/25 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Xuất PDF Đã Xóa ({selectedCount})</span>
              </button>

              <label className="cursor-pointer">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <span className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white underline">
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
                className={`group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border-2 p-3 cursor-pointer transition-all duration-300 shadow-md hover:scale-[1.02] ${
                  p.selectedForDeletion
                    ? 'border-rose-500 bg-rose-950/40 ring-4 ring-rose-500/20'
                    : p.isBlank
                    ? 'border-teal-500/60 bg-teal-950/20'
                    : 'border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Page Number & Checkbox Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300">
                    Trang {p.pageNumber}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      p.selectedForDeletion
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-slate-700 bg-slate-950'
                    }`}
                  >
                    {p.selectedForDeletion && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Thumbnail Image */}
                <div className="aspect-[3/4] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
                  {p.canvasThumbnail ? (
                    <img
                      src={p.canvasThumbnail}
                      alt={`Trang ${p.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Deletion Overlay */}
                  {p.selectedForDeletion && (
                    <div className="absolute inset-0 bg-rose-950/70 backdrop-blur-[1px] flex items-center justify-center text-white font-black text-xs uppercase tracking-wider">
                      Sẽ Xóa
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mt-2.5 text-center">
                  {p.isBlank ? (
                    <span className="inline-block px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Trang Trắng
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium text-slate-400">
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

