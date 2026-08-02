import React from 'react';
import {
  Scissors,
  Layers,
  Eraser,
  FileText,
  FileSpreadsheet,
  FileType2,
  TableProperties,
  ArrowRight,
  Zap,
  Pencil,
} from 'lucide-react';
import { ToolId, ToolMeta } from '../types';

export const TOOLS_LIST: ToolMeta[] = [
  {
    id: 'split',
    title: 'Tách Trang PDF',
    description: 'Tách theo từng trang lẻ hoặc khoảng trang tùy chọn. Giữ nguyên định dạng gốc.',
    icon: 'Scissors',
    color: 'from-blue-500 to-indigo-600',
    badge: 'Phổ biến',
  },
  {
    id: 'merge',
    title: 'Gộp Nhiều File PDF',
    description: 'Kéo thả gộp nhiều tệp PDF thành một tài liệu duy nhất. Sắp xếp thứ tự linh hoạt.',
    icon: 'Layers',
    color: 'from-indigo-500 to-sky-600',
    badge: 'Siêu Nhanh',
  },
  {
    id: 'remove-blank',
    title: 'Xóa Trang Trắng PDF',
    description: 'Tự động phát hiện và quét các trang trắng hoặc trống trong PDF. Cho phép xem trước và xóa.',
    icon: 'Eraser',
    color: 'from-amber-500 to-orange-600',
    badge: 'Tự Động AI',
  },
  {
    id: 'pdf-to-word',
    title: 'PDF Sang Word',
    description: 'Chuyển đổi PDF sang DOCX giữ nguyên font, bảng biểu, hình ảnh, khoảng cách và Unicode tiếng Việt.',
    icon: 'FileText',
    color: 'from-blue-600 to-blue-800',
    badge: 'Chuẩn DOCX',
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF Sang Excel',
    description: 'Tự động nhận diện bảng biểu trong PDF và trích xuất thành tệp Excel (.xlsx).',
    icon: 'FileSpreadsheet',
    color: 'from-emerald-500 to-teal-700',
    badge: 'Nhận Diện Bảng',
  },
  {
    id: 'word-to-pdf',
    title: 'Word Sang PDF',
    description: 'Hỗ trợ tệp DOC và DOCX. Giữ nguyên bố cục chuẩn, không lệch lề, không lỗi font.',
    icon: 'FileType2',
    color: 'from-cyan-600 to-blue-700',
  },
  {
    id: 'excel-to-pdf',
    title: 'Excel Sang PDF',
    description: 'Hỗ trợ XLS và XLSX. In vừa khổ giấy, giữ nguyên công thức kết quả, bảng màu và dữ liệu.',
    icon: 'TableProperties',
    color: 'from-emerald-600 to-green-700',
  },
  {
    id: 'edit-pdf',
    title: 'Sửa Nội Dung PDF',
    description: 'Thêm/sửa chữ, chèn hình ảnh, vẽ hình, và xóa nội dung trực tiếp trên file PDF một cách dễ dàng.',
    icon: 'Pencil',
    color: 'from-violet-500 to-purple-600',
    badge: 'Mới',
  },
];

interface HomeGridProps {
  onSelectTool: (id: ToolId) => void;
}

export const HomeGrid: React.FC<HomeGridProps> = ({ onSelectTool }) => {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scissors':
        return <Scissors className="w-7 h-7 text-white" />;
      case 'Layers':
        return <Layers className="w-7 h-7 text-white" />;
      case 'Eraser':
        return <Eraser className="w-7 h-7 text-white" />;
      case 'FileText':
        return <FileText className="w-7 h-7 text-white" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="w-7 h-7 text-white" />;
      case 'FileType2':
        return <FileType2 className="w-7 h-7 text-white" />;
      case 'TableProperties':
        return <TableProperties className="w-7 h-7 text-white" />;
      case 'Pencil':
        return <Pencil className="w-7 h-7 text-white" />;
      default:
        return <FileText className="w-7 h-7 text-white" />;
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 animate-fadeIn">
      {/* Banner / Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold tracking-wide">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Công Cụ Xử Lý PDF Trực Tuyến Hàng Đầu</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Bộ Công Cụ PDF Chuyên Nghiệp & Tốc Độ Cao
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Chạy trực tiếp 100% trên trình duyệt. Tách, gộp, xóa trang trắng, chuyển đổi PDF sang Word, Excel và ngược lại một cách an toàn, không lo lộ dữ liệu.
        </p>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TOOLS_LIST.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-md hover:shadow-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 relative flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Background Gradient Glow on Hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all" />

            <div>
              {/* Card Header: Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300`}
                >
                  {renderIcon(tool.icon)}
                </div>
                {tool.badge && (
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                {tool.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {tool.description}
              </p>
            </div>

            {/* Bottom Call to Action */}
            <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1.5 transition-transform">
              <span>Sử dụng ngay</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
