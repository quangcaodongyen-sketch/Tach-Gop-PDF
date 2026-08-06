import React, { useState, useRef } from 'react';
import {
  Upload,
  RotateCw,
  FileText,
  Download,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Square
} from 'lucide-react';
import { loadPdfPagesForRotation, rotatePdfPages } from '../../utils/pdfUtils';
import { downloadBlob } from '../../utils/zipUtils';
import { RotatePageInfo } from '../../types';
import { STORAGE_KEY } from '../ApiKeyModal';

interface ToolRotatePdfProps {
  onBack: () => void;
}

export const ToolRotatePdf: React.FC<ToolRotatePdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageInfos, setPageInfos] = useState<RotatePageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  
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

  // Auto detect text orientation using Gemini API
  const handleAutoRotateWithAi = async () => {
    const apiKey = localStorage.getItem(STORAGE_KEY) || '';
    if (!apiKey) {
      alert('Vui lòng cấu hình Gemini API Key trước khi sử dụng tính năng xoay bằng AI. Bạn có thể bấm vào biểu tượng API Key ở góc phải trên cùng để nhập.');
      return;
    }

    setIsAiProcessing(true);
    setAiProgress(0);

    const total = pageInfos.length;
    let completedCount = 0;
    
    // Make a copy of pages to update
    const updatedPages = [...pageInfos];

    try {
      const chunkSize = 2;
      for (let i = 0; i < updatedPages.length; i += chunkSize) {
        const chunk = updatedPages.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (page) => {
          if (!page.canvasThumbnail) return;

          // Convert DataURL to raw Base64 string
          const base64Data = page.canvasThumbnail.split(',')[1];
          
          try {
            const res = await fetch('/api/gemini/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-gemini-key': apiKey,
              },
              body: JSON.stringify({
                prompt: `Bạn là một chuyên gia xử lý ảnh tài liệu. Hãy phân tích hướng chữ của trang tài liệu này và xác định góc cần xoay THEO CHIỀU KIM ĐỒ HỒ (0, 90, 180, hoặc 270 độ) để chữ nằm xuôi, giúp người dùng đọc bình thường từ trái sang phải, từ trên xuống dưới.
Ví dụ:
- Nếu chữ đã nằm xuôi, thẳng đứng, đọc bình thường: Trả về 0
- Nếu tài liệu bị xoay ngang ngược chiều kim đồng hồ (đầu chữ nằm bên trái): Trả về 90
- Nếu tài liệu bị ngược đầu ngược đuôi (chữ lộn ngược): Trả về 180
- Nếu tài liệu bị xoay ngang thuận chiều kim đồng hồ (đầu chữ nằm bên phải): Trả về 270

Chỉ trả về DUY NHẤT một số là 0, 90, 180, hoặc 270, không trả về thêm bất kỳ từ nào khác.`,
                imageBase64: base64Data,
                mimeType: 'image/jpeg'
              })
            });

            if (!res.ok) {
              throw new Error('Lỗi phản hồi từ API');
            }

            const data = await res.json();
            const angleText = data.text ? data.text.trim() : '';
            const match = angleText.match(/(0|90|180|270)/);
            if (match) {
              const suggestedRotation = parseInt(match[1], 10);
              const idx = updatedPages.findIndex(p => p.pageNumber === page.pageNumber);
              if (idx !== -1) {
                updatedPages[idx] = {
                  ...updatedPages[idx],
                  rotation: suggestedRotation % 360
                };
              }
            }
          } catch (err) {
            console.error(`Error auto-rotating page ${page.pageNumber}:`, err);
          } finally {
            completedCount++;
            setAiProgress(Math.round((completedCount / total) * 100));
          }
        }));

        setPageInfos([...updatedPages]);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xử lý bằng AI');
    } finally {
      setIsAiProcessing(false);
    }
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
              Xoay thủ công từng trang bằng cách bấm chuột hoặc sửa chiều chữ hàng loạt tự động bằng AI thông minh.
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

      {/* AI Processing status */}
      {isAiProcessing && (
        <div className="glass-card rounded-3xl p-8 shadow-2xl text-center space-y-5 border border-indigo-500/30 bg-indigo-950/15 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse mx-auto" />
          <h3 className="font-black text-lg text-white">
            AI đang phân tích & xoay tự động theo chiều đọc ({aiProgress}%)...
          </h3>
          <p className="text-xs text-indigo-300">
            Sử dụng Gemini API để nhận diện văn bản ngang dọc và sửa chiều tự động.
          </p>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden max-w-md mx-auto shadow-inner border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-400 to-purple-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${aiProgress}%` }}
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
                Click vào từng trang để xoay 90° hoặc chọn xoay hàng loạt bên phải.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAutoRotateWithAi}
                disabled={isAiProcessing}
                className="px-4 py-2 bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 fill-indigo-400 animate-pulse" />
                <span>Tự động xoay bằng AI</span>
              </button>

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
                  className="group relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 hover:border-amber-500/50 p-3 cursor-pointer transition-all duration-300 shadow-md hover:scale-[1.02] flex flex-col justify-between"
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

                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 backdrop-blur-[0.5px] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
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
