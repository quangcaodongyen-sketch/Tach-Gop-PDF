import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, ArrowLeft, FileText, Download, Type, Image, Pencil, Eraser, Save, Trash2, Plus, Minus, RotateCcw, Bold, Italic, Palette } from 'lucide-react';
import { renderPdfPages, applyAnnotationsToPdf, generateId, Annotation, PdfPageRender } from '../../utils/pdfEditUtils';
import { downloadBlob } from '../../utils/zipUtils';

interface ToolEditPdfProps { onBack: () => void; }

type EditMode = 'select' | 'text' | 'draw' | 'erase' | 'image';

interface PendingText {
  id: string; pageIndex: number; x: number; y: number;
  text: string; fontSize: number; color: string; bold: boolean; italic: boolean;
}

export const ToolEditPdf: React.FC<ToolEditPdfProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageRender[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [mode, setMode] = useState<EditMode>('select');
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [textSettings, setTextSettings] = useState({ fontSize: 14, color: '#000000', bold: false, italic: false });
  const [drawSettings, setDrawSettings] = useState({ color: '#ef4444', lineWidth: 3 });
  const [pendingTexts, setPendingTexts] = useState<PendingText[]>([]);
  const [drawingPoints, setDrawingPoints] = useState<{x:number;y:number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    setAnnotations([]);
    setPendingTexts([]);
    setCurrentPage(0);
    setLoading(true);
    setLoadProgress(0);
    try {
      const rendered = await renderPdfPages(selected, 1.5, (cur, total) => {
        setLoadProgress(Math.round((cur / total) * 100));
      });
      setPages(rendered);
    } catch (err: any) {
      alert('Không thể mở file PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRelativePos = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), pageIdx };
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    const pos = getRelativePos(e, pageIdx);
    if (mode === 'text') {
      const newText: PendingText = {
        id: generateId(), pageIndex: pageIdx, x: pos.x, y: pos.y,
        text: '', fontSize: textSettings.fontSize, color: textSettings.color,
        bold: textSettings.bold, italic: textSettings.italic,
      };
      setPendingTexts(prev => [...prev, newText]);
    } else if (mode === 'erase') {
      const ann: Annotation = {
        type: 'whiteout', id: generateId(), pageIndex: pageIdx,
        x: pos.x - 5, y: pos.y - 2, width: 10, height: 4,
      };
      setAnnotations(prev => [...prev, ann]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    if (mode === 'draw') {
      const pos = getRelativePos(e, pageIdx);
      setIsDrawing(true);
      setDrawingPoints([{ x: pos.x, y: pos.y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    if (mode === 'draw' && isDrawing) {
      const pos = getRelativePos(e, pageIdx);
      setDrawingPoints(prev => [...prev, { x: pos.x, y: pos.y }]);
    }
  };

  const handleMouseUp = (_e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    if (mode === 'draw' && isDrawing && drawingPoints.length > 1) {
      const ann: Annotation = {
        type: 'draw', id: generateId(), pageIndex: pageIdx,
        points: [...drawingPoints], color: drawSettings.color, lineWidth: drawSettings.lineWidth,
      };
      setAnnotations(prev => [...prev, ann]);
    }
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const imgFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const ann: Annotation = {
        type: 'image', id: generateId(), pageIndex: currentPage,
        x: 10, y: 10, width: 30, height: 30, dataUrl,
      };
      setAnnotations(prev => [...prev, ann]);
    };
    reader.readAsDataURL(imgFile);
    e.target.value = '';
  };

  const commitPendingText = (id: string) => {
    const pt = pendingTexts.find(t => t.id === id);
    if (!pt || !pt.text.trim()) {
      setPendingTexts(prev => prev.filter(t => t.id !== id));
      return;
    }
    const ann: Annotation = {
      type: 'text', id: pt.id, pageIndex: pt.pageIndex,
      x: pt.x, y: pt.y, text: pt.text, fontSize: pt.fontSize,
      color: pt.color, fontFamily: 'Helvetica', bold: pt.bold, italic: pt.italic,
    };
    setAnnotations(prev => [...prev, ann]);
    setPendingTexts(prev => prev.filter(t => t.id !== id));
  };

  const handleUndo = () => {
    if (pendingTexts.length > 0) {
      setPendingTexts(prev => prev.slice(0, -1));
    } else {
      setAnnotations(prev => prev.slice(0, -1));
    }
  };

  const handleSaveAndDownload = async () => {
    if (!file) return;
    // Commit all pending texts first
    const allAnnotations = [...annotations];
    for (const pt of pendingTexts) {
      if (pt.text.trim()) {
        allAnnotations.push({
          type: 'text', id: pt.id, pageIndex: pt.pageIndex,
          x: pt.x, y: pt.y, text: pt.text, fontSize: pt.fontSize,
          color: pt.color, fontFamily: 'Helvetica', bold: pt.bold, italic: pt.italic,
        });
      }
    }
    setSaving(true);
    try {
      const pdfBytes = await applyAnnotationsToPdf(file, allAnnotations);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const outName = file.name.replace(/\.pdf$/i, '') + '_edited.pdf';
      downloadBlob(blob, outName);
    } catch (err: any) {
      alert('Lỗi lưu PDF: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const pageAnnotations = annotations.filter(a => a.pageIndex === currentPage);
  const pageTexts = pendingTexts.filter(t => t.pageIndex === currentPage);
  const currentPageData = pages[currentPage];
  const totalAnnotations = annotations.length + pendingTexts.filter(t => t.text.trim()).length;
  const zoomScale = zoom / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-fadeIn">
      <button onClick={onBack} className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all">
        <ArrowLeft className="w-4 h-4" /><span>Quay về trang chủ</span>
      </button>

      <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><Pencil className="w-8 h-8 text-white" /></div>
          <div>
            <h2 className="text-2xl font-black">Sửa Nội Dung PDF</h2>
            <p className="text-xs text-purple-100">Thêm/sửa chữ, chèn hình ảnh, vẽ, xóa nội dung trực tiếp trên file PDF.</p>
          </div>
        </div>
      </div>

      {!file && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border-2 border-dashed border-violet-300 dark:border-slate-700 hover:border-violet-500 transition-all text-center space-y-4">
          <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950/50 rounded-full flex items-center justify-center mx-auto text-violet-600">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Chọn tệp PDF cần chỉnh sửa</h3>
          <p className="text-xs text-slate-500">Hỗ trợ thêm chữ, hình ảnh, vẽ hình và xóa nội dung</p>
          <label className="inline-block">
            <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            <span className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all inline-flex items-center space-x-2">
              <FileText className="w-4 h-4" /><span>Chọn File PDF</span>
            </span>
          </label>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-md text-center space-y-4">
          <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-bold text-base">Đang tải PDF ({loadProgress}%)...</h3>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden max-w-md mx-auto">
            <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${loadProgress}%` }} />
          </div>
        </div>
      )}

      {file && !loading && pages.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              {/* Mode buttons */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-0.5">
                {([
                  { m: 'select' as EditMode, icon: <FileText className="w-4 h-4" />, label: 'Chọn' },
                  { m: 'text' as EditMode, icon: <Type className="w-4 h-4" />, label: 'Chữ' },
                  { m: 'draw' as EditMode, icon: <Pencil className="w-4 h-4" />, label: 'Vẽ' },
                  { m: 'erase' as EditMode, icon: <Eraser className="w-4 h-4" />, label: 'Xóa' },
                ]).map(btn => (
                  <button key={btn.m} onClick={() => setMode(btn.m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${mode === btn.m ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {btn.icon}<span className="hidden sm:inline">{btn.label}</span>
                  </button>
                ))}
                <label className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${mode === 'image' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                  <Image className="w-4 h-4" /><span className="hidden sm:inline">Ảnh</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Text settings */}
              {mode === 'text' && (
                <div className="flex items-center gap-2">
                  <select value={textSettings.fontSize} onChange={e => setTextSettings(s => ({...s, fontSize: Number(e.target.value)}))}
                    className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium">
                    {[8,10,12,14,16,18,20,24,28,32,36,48].map(s => <option key={s} value={s}>{s}px</option>)}
                  </select>
                  <button onClick={() => setTextSettings(s => ({...s, bold: !s.bold}))}
                    className={`p-1.5 rounded-lg ${textSettings.bold ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}><Bold className="w-4 h-4" /></button>
                  <button onClick={() => setTextSettings(s => ({...s, italic: !s.italic}))}
                    className={`p-1.5 rounded-lg ${textSettings.italic ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'}`}><Italic className="w-4 h-4" /></button>
                  <input type="color" value={textSettings.color} onChange={e => setTextSettings(s => ({...s, color: e.target.value}))}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer" />
                </div>
              )}

              {mode === 'draw' && (
                <div className="flex items-center gap-2">
                  <select value={drawSettings.lineWidth} onChange={e => setDrawSettings(s => ({...s, lineWidth: Number(e.target.value)}))}
                    className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium">
                    {[1,2,3,5,8].map(w => <option key={w} value={w}>{w}px</option>)}
                  </select>
                  <input type="color" value={drawSettings.color} onChange={e => setDrawSettings(s => ({...s, color: e.target.value}))}
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer" />
                </div>
              )}

              <div className="flex-1" />

              {/* Zoom */}
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><Minus className="w-4 h-4" /></button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><Plus className="w-4 h-4" /></button>
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Actions */}
              <button onClick={handleUndo} disabled={annotations.length === 0 && pendingTexts.length === 0}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-30" title="Hoàn tác">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={handleSaveAndDownload} disabled={saving || totalAnnotations === 0}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-all flex items-center space-x-1.5">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{saving ? 'Đang lưu...' : 'Lưu & Tải Về'}</span>
              </button>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold disabled:opacity-30">← Trước</button>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Trang {currentPage + 1} / {pages.length}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))} disabled={currentPage >= pages.length - 1}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold disabled:opacity-30">Sau →</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{totalAnnotations} thay đổi</span>
              <label className="cursor-pointer">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <span className="text-xs font-bold text-violet-600 hover:underline">Đổi File</span>
              </label>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex justify-center bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 overflow-auto" ref={canvasContainerRef}>
            {currentPageData && (
              <div className="relative shadow-2xl" style={{ width: currentPageData.width * zoomScale, height: currentPageData.height * zoomScale }}>
                {/* PDF page image */}
                <img src={currentPageData.thumbnailDataUrl} alt={`Trang ${currentPage + 1}`}
                  className="w-full h-full select-none pointer-events-none" draggable={false} />

                {/* Interactive overlay */}
                <div className={`absolute inset-0 pdf-editor-canvas mode-${mode}`}
                  onClick={(e) => handlePageClick(e, currentPage)}
                  onMouseDown={(e) => handleMouseDown(e, currentPage)}
                  onMouseMove={(e) => handleMouseMove(e, currentPage)}
                  onMouseUp={(e) => handleMouseUp(e, currentPage)}>

                  {/* Render whiteout annotations */}
                  {pageAnnotations.filter(a => a.type === 'whiteout').map(a => (
                    <div key={a.id} className="absolute bg-white border border-slate-200" style={{
                      left: `${(a as any).x}%`, top: `${(a as any).y}%`,
                      width: `${(a as any).width}%`, height: `${(a as any).height}%`
                    }} />
                  ))}

                  {/* Render text annotations */}
                  {pageAnnotations.filter(a => a.type === 'text').map(a => (
                    <div key={a.id} className="absolute px-1 pointer-events-none" style={{
                      left: `${(a as any).x}%`, top: `${(a as any).y}%`,
                      fontSize: `${(a as any).fontSize * zoomScale}px`,
                      color: (a as any).color,
                      fontWeight: (a as any).bold ? 'bold' : 'normal',
                      fontStyle: (a as any).italic ? 'italic' : 'normal',
                      whiteSpace: 'pre-wrap',
                    }}>{(a as any).text}</div>
                  ))}

                  {/* Render image annotations */}
                  {pageAnnotations.filter(a => a.type === 'image').map(a => (
                    <img key={a.id} src={(a as any).dataUrl} alt="" className="absolute object-contain pointer-events-none" style={{
                      left: `${(a as any).x}%`, top: `${(a as any).y}%`,
                      width: `${(a as any).width}%`, height: `${(a as any).height}%`,
                    }} />
                  ))}

                  {/* Render draw annotations as SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {pageAnnotations.filter(a => a.type === 'draw').map(a => {
                      const pts = (a as any).points as {x:number;y:number}[];
                      if (pts.length < 2) return null;
                      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      return <path key={a.id} d={d} stroke={(a as any).color} strokeWidth={(a as any).lineWidth * 0.15} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
                    })}
                    {/* Active drawing */}
                    {isDrawing && drawingPoints.length > 1 && (
                      <path d={drawingPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                        stroke={drawSettings.color} strokeWidth={drawSettings.lineWidth * 0.15} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    )}
                  </svg>

                  {/* Pending text inputs */}
                  {pageTexts.map(pt => (
                    <textarea key={pt.id} className="text-edit-overlay" autoFocus
                      style={{
                        left: `${pt.x}%`, top: `${pt.y}%`,
                        fontSize: `${pt.fontSize * zoomScale}px`,
                        color: pt.color,
                        fontWeight: pt.bold ? 'bold' : 'normal',
                        fontStyle: pt.italic ? 'italic' : 'normal',
                      }}
                      value={pt.text}
                      onChange={e => setPendingTexts(prev => prev.map(t => t.id === pt.id ? {...t, text: e.target.value} : t))}
                      onBlur={() => commitPendingText(pt.id)}
                      onKeyDown={e => { if (e.key === 'Escape') commitPendingText(pt.id); }}
                      placeholder="Nhập nội dung..."
                      onClick={e => e.stopPropagation()}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Page thumbnails strip */}
          {pages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pages.map((pg, idx) => (
                <button key={idx} onClick={() => setCurrentPage(idx)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${idx === currentPage ? 'border-violet-500 shadow-lg scale-105' : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 opacity-70 hover:opacity-100'}`}>
                  <img src={pg.thumbnailDataUrl} alt={`Trang ${idx + 1}`} className="h-20 w-auto" />
                  <div className="text-[10px] font-bold text-center py-0.5 bg-slate-50 dark:bg-slate-800">{idx + 1}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
