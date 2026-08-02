import React from 'react';
import {
  Scissors,
  Layers,
  Eraser,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { ToolId, ToolMeta } from '../types';

export const TOOLS_LIST: ToolMeta[] = [
  {
    id: 'split',
    title: 'Tách Trang PDF',
    description: 'Tách theo từng trang lẻ hoặc khoảng trang tùy chọn. Nhanh chóng và giữ nguyên định dạng gốc hoàn hảo.',
    icon: 'Scissors',
    color: 'from-pink-500 via-rose-500 to-orange-500',
    badge: 'Phổ biến',
  },
  {
    id: 'merge',
    title: 'Gộp Nhiều File PDF',
    description: 'Kéo thả gộp nhiều tệp PDF thành một tài liệu duy nhất. Sắp xếp thứ tự linh hoạt siêu tốc độ.',
    icon: 'Layers',
    color: 'from-violet-500 via-purple-500 to-fuchsia-500',
    badge: 'Siêu Nhanh',
  },
  {
    id: 'remove-blank',
    title: 'Xóa Trang Trắng',
    description: 'Tự động phân tích, phát hiện và xóa các trang trắng hoặc trống hoàn toàn bằng thuật toán thông minh.',
    icon: 'Eraser',
    color: 'from-cyan-400 via-teal-500 to-emerald-500',
    badge: 'Tự Động AI',
  }
];

interface HomeGridProps {
  onSelectTool: (id: ToolId) => void;
}

export const HomeGrid: React.FC<HomeGridProps> = ({ onSelectTool }) => {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scissors':
        return <Scissors className="w-8 h-8 text-white drop-shadow-md" />;
      case 'Layers':
        return <Layers className="w-8 h-8 text-white drop-shadow-md" />;
      case 'Eraser':
        return <Eraser className="w-8 h-8 text-white drop-shadow-md" />;
      default:
        return <Layers className="w-8 h-8 text-white drop-shadow-md" />;
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 animate-fadeIn relative z-10">
      {/* Banner / Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass-card border-white/40 shadow-lg text-slate-800 dark:text-white text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-2">
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-rose-600 dark:from-violet-400 dark:to-rose-400">PDF Pro V2.0</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Xử Lý PDF <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-rose-600 animate-pulse">Nghệ Thuật</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
          Trải nghiệm công cụ xử lý PDF mượt mà, rực rỡ và siêu tốc. 100% bảo mật do mọi thao tác diễn ra ngay trên thiết bị của bạn.
        </p>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {TOOLS_LIST.map((tool, idx) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group cursor-pointer glass-card rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)] transition-all duration-500 transform hover:-translate-y-2 relative flex flex-col justify-between overflow-hidden z-10 animation-delay-${idx * 2000}`}
          >
            {/* Ambient Background Gradient Glow on Hover */}
            <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${tool.color} rounded-full blur-3xl opacity-10 group-hover:opacity-30 transition-opacity duration-500 -z-10`} />

            <div>
              {/* Card Header: Icon & Badge */}
              <div className="flex items-start justify-between mb-8">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                >
                  {renderIcon(tool.icon)}
                </div>
                {tool.badge && (
                  <span className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md text-slate-800 dark:text-white border border-white/40 shadow-sm">
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                {tool.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-medium">
                {tool.description}
              </p>
            </div>

            {/* Bottom Call to Action */}
            <div className={`flex items-center text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${tool.color} group-hover:translate-x-2 transition-transform duration-300`}>
              <span className="mr-2">Khám phá ngay</span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r ${tool.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
