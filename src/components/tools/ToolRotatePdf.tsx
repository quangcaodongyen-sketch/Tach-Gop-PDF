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
import { analyzeWithGemini } from '../../utils/geminiApi';

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
  const [loadingPageNumbers, setLoadingPageNumbers] = useState<number[]>([]);
  
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

  // Auto detect text orientation using Gemini API for a single page (on right click)
  const handleAutoRotateSinglePage = async (pageNumber: number) => {
    const apiKey = localStorage.getItem(STORAGE_KEY) || '';
    if (!apiKey) {
      alert('Vui lòng cấu hình Gemini API Key trước khi sử dụng tính năng xoay bằng AI. Bạn có thể bấm vào biểu tượng API Key ở góc phải trên cùng để nhập.');
      return;
    }

    const page = pageInfos.find((p) => p.pageNumber === pageNumber);
    if (!page || !page.canvasThumbnail) return;

    // Add page number to loading state
    setLoadingPageNumbers((prev) => [...prev, pageNumber]);

    try {
      const base64Data = page.canvasThumbnail.split(',')[1];
      const resultText = await analyzeWithGemini({
        prompt: `Hãy nhìn vào chữ trên trang tài liệu này và xác định hướng đọc của chữ hiện tại. 
Để chữ trên trang tài liệu này có thể đọc được bình thường từ trái sang phải, từ trên xuống dưới (đầu chữ hướng lên trên), chúng ta cần xoay trang này bao nhiêu độ THEO CHIỀU KIM ĐỒ HỒ?
Hãy chọn một trong các giá trị sau:
- 0: Nếu chữ đã thẳng đứng, đầu chữ hướng lên trên, đọc được ngay.
- 90: Nếu đầu chữ đang hướng sang bên trái (trang bị xoay ngang sang trái, dòng chữ chạy thẳng đứng từ dưới lên trên), cần xoay 90 độ theo chiều kim đồng hồ để thẳng đứng.
- 180: Nếu đầu chữ đang hướng xuống dưới (trang bị ngược đầu, lộn ngược 180 độ), cần xoay 180 độ để thẳng đứng.
- 270: Nếu đầu chữ đang hướng sang bên phải (trang bị xoay ngang sang phải, dòng chữ chạy thẳng đứng từ trên xuống dưới), cần xoay 270 độ theo chiều kim đồng hồ để thẳng đứng.

Chỉ trả về duy nhất một con số: 0, 90, 180, hoặc 270. Không giải thích gì thêm.`,
        imageBase64: base64Data,
        mimeType: 'image/jpeg'
      });

      const match = resultText.trim().match(/(0|90|180|270)/);
      if (match) {
        const suggestedRotation = parseInt(match[1], 10);
        setPageInfos((prev) =>
          prev.map((p) =>
            p.pageNumber === pageNumber ? { ...p, rotation: suggestedRotation % 360 } : p
          )
        );
      }
    } catch (err: any) {
      alert(`Lỗi nhận diện trang ${pageNumber}: ` + err.message);
    } finally {
      setLoadingPageNumbers((prev) => prev.filter((id) => id !== pageNumber));
    }
  };

  // Auto detect text orientation using Gemini API (batch process all pages)
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
    
    const updatedPages = [...pageInfos];

    try {
      const chunkSize = 2;
      for (let i = 0; i < updatedPages.length; i += chunkSize) {
        const chunk = updatedPages.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (page) => {
          if (!page.canvasThumbnail) return;

          const base64Data = page.canvasThumbnail.split(',')[1];
          
          try {
            const resultText = await analyzeWithGemini({
              prompt: `Hãy nhìn vào chữ trên trang tài liệu này và xác định hướng đọc của chữ hiện tại. 
Để chữ trên trang tài liệu này có thể đọc được bình thường từ trái sang phải, từ trên xuống dưới (đầu chữ hướng lên trên), chúng ta cần xoay trang này bao nhiêu độ THEO CHIỀU KIM ĐỒ HỒ?
Hãy chọn một trong các giá trị sau:
- 0: Nếu chữ đã thẳng đứng, đầu chữ hướng lên trên, đọc được ngay.
- 90: Nếu đầu chữ đang hướng sang bên trái (trang bị xoay ngang sang trái, dòng chữ chạy thẳng đứng từ dưới lên trên), cần xoay 90 độ theo chiều kim đồng hồ để thẳng đứng.
- 180: Nếu đầu chữ đang hướng xuống dưới (trang bị ngược đầu, lộn ngược 180 độ), cần xoay 180 độ để thẳng đứng.
- 270: Nếu đầu chữ đang hướng sang bên phải (trang bị xoay ngang sang phải, dòng chữ chạy thẳng đứng từ trên xuống dưới), cần xoay 270 độ theo chiều kim đồng hồ để thẳng đứng.

Chỉ trả về duy nhất một con số: 0, 90, 180, hoặc 270. Không giải thích gì thêm.`,
              imageBase64: base64Data,
              mimeType: 'image/jpeg'
            });

            const match = resultText.trim().match(/(0|90|180|270)/);
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
              Click chuột trái để xoay 90°, click chuột phải để chạy AI tự động sửa chiều đọc chữ cho từng trang.
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
              Hỗ trợ kéo thả file PDF trực tiếp vào trình duyệt
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
                Nhấp <span className="text-amber-400 font-bold">chuột trái</span> để xoay 90°, nhấp <span className="text-indigo-400 font-bold">chuột phải</span> để tự động nhận diện hướng chữ bằng AI.
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
              const isPageProcessing = loadingPageNumbers.includes(p.pageNumber);

              return (
                <div
                  key={p.pageNumber}
                  onClick={() => handleRotatePage(p.pageNumber)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleAutoRotateSinglePage(p.pageNumber);
                  }}
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

                    {/* AI Processing overlay for single page */}
                    {isPageProcessing && (
                      <div className="absolute inset-0 bg-indigo-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center text-white space-y-1.5">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Đang quét AI...</span>
                      </div>
                    )}

                    {/* Hover rotation overlay */}
                    {!isPageProcessing && (
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 backdrop-blur-[0.5px] transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 space-y-2">
                        <div className="p-2 bg-amber-500 rounded-full text-white shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                          <RotateCw className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] bg-slate-950/80 text-slate-200 px-2 py-0.5 rounded-md font-medium border border-slate-800">
                          Click phải: Xoay bằng AI
                        </span>
                      </div>
                    )}
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
