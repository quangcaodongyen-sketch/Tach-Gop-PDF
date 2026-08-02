import React from 'react';
import {
  Scissors,
  Layers,
  Eraser,
  ArrowRight,
  Zap,
  ShieldCheck,
  Cpu,
  Lock,
} from 'lucide-react';
import { ToolId, ToolMeta } from '../types';

export const TOOLS_LIST: ToolMeta[] = [
  {
    id: 'split',
    title: 'Tách Trang PDF',
    description: 'Trích xuất từng trang đơn lẻ hoặc theo khoảng trang tùy chỉnh. Đảm bảo giữ nguyên độ phân giải và chất lượng tài liệu.',
    icon: 'Scissors',
    color: 'from-rose-500 via-pink-500 to-amber-500',
    badge: 'Phổ biến',
  },
  {
    id: 'merge',
    title: 'Gộp Nhiều File PDF',
    description: 'Hợp nhất nhiều tệp PDF thành một file duy nhất chỉ bằng thao tác kéo thả. Tự do thay đổi thứ tự tài liệu linh hoạt.',
    icon: 'Layers',
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    badge: 'Siêu Nhanh',
  },
  {
    id: 'remove-blank',
    title: 'Xóa Trang Trắng',
    description: 'Tự động phát hiện và loại bỏ các trang trắng hoặc chứa nội dung rác. Phân tích điểm ảnh thông minh bằng Canvas.',
    icon: 'Eraser',
    color: 'from-emerald-400 via-teal-500 to-cyan-500',
    badge: 'Tự Động Smart',
  }
];

interface HomeGridProps {
  onSelectTool: (id: ToolId) => void;
}

export const HomeGrid: React.FC<HomeGridProps> = ({ onSelectTool }) => {
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scissors':
        return <Scissors className="w-8 h-8 text-white drop-shadow-lg" />;
      case 'Layers':
        return <Layers className="w-8 h-8 text-white drop-shadow-lg" />;
      case 'Eraser':
        return <Eraser className="w-8 h-8 text-white drop-shadow-lg" />;
      default:
        return <Layers className="w-8 h-8 text-white drop-shadow-lg" />;
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 animate-fadeIn relative z-10">
      {/* Banner / Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass-card border border-indigo-500/30 shadow-lg text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-black">
            Bản Nâng Cấp PDF Ultra v3.0
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 via-fuchsia-400 via-rose-400 to-amber-400 bg-clip-text text-transparent gradient-text-animated drop-shadow-lg">
            GỘP - TÁCH PDF
          </span>
        </h1>

        <p className="text-base sm:text-xl font-bold bg-gradient-to-r from-sky-300 via-purple-300 to-pink-300 bg-clip-text text-transparent leading-relaxed max-w-2xl mx-auto">
          Dễ dàng tách trang, gộp nhiều file và tự động xóa trang trắng PDF nhanh chóng, chính xác & giữ nguyên chất lượng gốc.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Client-Side</span>
          </div>
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Không Cần Máy Chủ</span>
          </div>
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
            <span>Bảo Mật Dữ Liệu</span>
          </div>
        </div>
      </div>

      {/* Tools Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2 sm:px-4">
        {TOOLS_LIST.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group cursor-pointer glass-card rounded-3xl p-8 shadow-2xl transition-all duration-500 transform hover:-translate-y-2 relative flex flex-col justify-between overflow-hidden z-10 border border-white/10 hover:border-white/20"
          >
            {/* Ambient Background Gradient Glow on Hover */}
            <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${tool.color} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 -z-10`} />

            <div>
              {/* Card Header: Icon & Badge */}
              <div className="flex items-start justify-between mb-8">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}
                >
                  {renderIcon(tool.icon)}
                </div>
                {tool.badge && (
                  <span className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 border border-slate-700/80 shadow-xs">
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className={`text-2xl font-black mb-3 tracking-tight bg-gradient-to-r ${tool.color} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
                {tool.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-8 font-medium">
                {tool.description}
              </p>
            </div>

            {/* Bottom Call to Action */}
            <div className={`flex items-center justify-between text-sm font-bold text-slate-200 group-hover:text-white transition-colors`}>
              <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 group-hover:text-indigo-300 transition-colors">
                Sử dụng ngay
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-r ${tool.color} text-white shadow-md group-hover:translate-x-1.5 transition-all`}>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

