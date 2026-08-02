import React from 'react';
import { FileText, Home, Key, UserCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { ToolId } from '../types';

interface HeaderProps {
  activeTool: ToolId | null;
  onGoHome: () => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onGoHome,
  onOpenApiKeyModal,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-xl shadow-black/30">
      {/* Top Banner Notice - Author & Copyright Info */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-pink-900/60 border-b border-slate-800/80 py-1.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2 text-[11px] sm:text-xs font-black tracking-wide">
          <UserCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-300">Tác giả & Bản quyền:</span>
          <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
            Đinh Văn Thành – 0915.213717
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onGoHome}
            className="flex items-center space-x-3 group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-black bg-gradient-to-r from-pink-400 via-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                  PDF Pro
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-pink-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  Ultra
                </span>
              </div>
              <span className="block text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-300 via-rose-400 to-pink-400 bg-clip-text text-transparent">
                GỘP - TÁCH PDF
              </span>
            </div>
          </button>

          {activeTool && (
            <div className="hidden sm:flex items-center space-x-2 pl-4 border-l border-slate-800">
              <button
                onClick={onGoHome}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-xs"
              >
                <Home className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trang chủ</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Controls: API Key Settings Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              hasApiKey
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
            title="Nhập hoặc đổi API Key cá nhân"
          >
            {hasApiKey ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">API Key: Đã Kích Hoạt</span>
                <span className="sm:hidden">API Key</span>
              </>
            ) : (
              <>
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Cấu Hình API Key</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};


