import React, { useState, useRef } from 'react';
import {
  Upload,
  RotateCw,
  FileText,
  Download,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Square
} from 'lucide-react';
import { loadPdfPagesForRotation, rotatePdfPages } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/zipUtils';
import { RotatePageInfo } from '../../types';

interface ToolRotatePdfProps {
  onBack: () => void;
}

export const ToolRotatePdf: React.FC<ToolRotatePdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageInfos, setPageInfos] = useState<RotatePageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const cancelledRef = useRef(false);

  const handleFile = async (selected: File) => {
    setFile(selected);
    setPageInfos([]);
    setIsLoading(true);
    setLoadProgress(0);
    cancelledRef.current = false;

    try {
      const loaded = await loadPdfPagesForRotation(selected, (processed, total) => {
        setLoadProgress(Math.round((processed / total) * 100));
      }, cancelledRef);
      if (!cancelledRef.current) {
        setPageInfos(loaded);
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        alert('Không thể tải file PDF: ' + err.message);
        setFile(null);
      }
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
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

  const handleCancelLoad = () => {
    cancelledRef.current = true;
    setIsLoading(false);
    setFile(null);
  };

  const handleRotatePage = (pageNumber: number) => {
    setPageInfos((prev) =>
      prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const handleRotateAll = () => {
    setPageInfos((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    );
  };

  const handleResetAll = () => {
    setPageInfos((prev) =>
      prev.map((p) => ({ ...p, rotation: 0 }))
    );
  };

  const handleExportPdf = async () => {
    if (!file) return;

    const rotations = pageInfos.map((p) => {
      const absAngle = (p.originalRotation + p.rotation) % 360;
      return {
        pageNumber: p.pageNumber,
        rotation: absAngle,
      };
    });

    try {
      setIsLoading(true);
      setLoadProgress(50);
      const rotatedPdfBytes = await rotatePdfPages(file, rotations);
      const blob = new Blob([rotatedPdfBytes], { type: 'application/pdf' });
      downloadBlob(blob, `${file.name.replace(/\.pdf$/i, '')}_da_xoay.pdf`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xuất PDF đã xoay');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-800 shadow-md transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-amber-400" />
        <span>Quay về trang chủ</span>
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white rounded-3xl p-8 shadow-2xl flex items-center justify-between relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>

        <div className="flex items-center space-x-5 relative z-10">
          <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
            <RotateCw className="w-10 h-10 text-white drop-shadow-md animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md">Xoay Trang PDF</h2>
            <p className="text-sm text-amber-100 font-medium mt-1">
              Nhấp chuột trái vào từng trang để xoay 90 độ theo chiều kim đồng hồ.
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
            isDragOver ? 'border-amber-400 bg-amber-950/20 scale-[1.01]' : 'border-slate-800 hover:border-amber-500/50 hover:shadow-2xl'
          }`}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400 border border-amber-500/30 shadow-inner">
            <Upload className="w-9 h-9" />
          </div>
          <div>
            <h3 className="font-black text-xl text-white tracking-tight">
              Chọn tệp PDF cần xoay trang
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống hỗ trợ xoay trực quan bằng cách bấm vào từng trang
            </p>
          </div>
          <label className="inline-block">
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <span className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-sm font-bold cursor-pointer shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all inline-flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Tải File PDF Lên</span>
            </span>
          </label>
        </div>
      )}

      {/* Loading Progress */}
      {isLoading && (
        <div className="glass-card rounded-3xl p-8 shadow-2xl text-center space-y-5 relative overflow-hidden border border-slate-800">
          <button onClick={handleCancelLoad} className="absolute top-4 right-4 text-slate-400 hover:text-rose-400 relative z-10 transition-colors cursor-pointer">
            <Square className="w-6 h-6" />
          </button>
          <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto relative z-10" />
          <h3 className="font-black text-lg text-white relative z-10">
            Đang tải dữ liệu và tạo ảnh xem trước ({loadProgress}%)...
          </h3>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden max-w-md mx-auto relative z-10 shadow-inner border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Page Thumbnails Preview Grid */}
      {file && !isLoading && pageInfos.length > 0 && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="glass-card rounded-3xl p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4 relative z-10 border border-slate-800">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-white">
                Tổng số: {pageInfos.length} trang
              </h3>
              <p className="text-xs text-slate-400">
                Nhấp chuột trái vào từng trang để xoay 90° theo chiều kim đồng hồ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRotateAll}
                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>Xoay tất cả +90°</span>
              </button>

              <button
                onClick={handleResetAll}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm border border-slate-800 cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Reset tất cả</span>
              </button>

              <button
                onClick={handleExportPdf}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất PDF ({pageInfos.filter(p => p.rotation !== 0).length} trang đã xoay)</span>
              </button>

              <label className="cursor-pointer ml-2">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <span className="text-xs font-bold text-slate-400 hover:text-white underline">
                  Đổi File
                </span>
              </label>
            </div>
          </div>

          {/* Grid view of pages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pageInfos.map((p) => {
              const visualRot = (p.originalRotation + p.rotation) % 360;

              return (
                <div
                  key={p.pageNumber}
                  onClick={() => handleRotatePage(p.pageNumber)}
                  className="group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-amber-500/50 p-3 cursor-pointer transition-all duration-300 shadow-md hover:scale-[1.02] flex flex-col justify-between select-none"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-300">
                      Trang {p.pageNumber}
                    </span>
                    {p.rotation !== 0 && (
                      <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        +{p.rotation}°
                      </span>
                    )}
                  </div>

                  <div className="aspect-[3/4] bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 flex items-center justify-center relative p-1">
                    <div
                      className="w-full h-full transition-transform duration-300 ease-in-out flex items-center justify-center"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    >
                      {p.canvasThumbnail ? (
                        <img
                          src={p.canvasThumbnail}
                          alt={`Trang ${p.pageNumber}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-slate-600" />
                      )}
                    </div>

                    {/* Hover rotation overlay */}
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 backdrop-blur-[0.5px] transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 space-y-2">
                      <div className="p-2 bg-amber-500 rounded-full text-white shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                        <RotateCw className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 text-center flex items-center justify-center space-x-1">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Gốc: {p.originalRotation}°
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      → Hiện tại: {visualRot}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
