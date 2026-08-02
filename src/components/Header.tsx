import React from 'react';
import { FileText, Key, Home, Sparkles, CheckCircle2 } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onGoHome}
            className="flex items-center space-x-3 group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
                PDF Pro
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Xử lý PDF Siêu Tốc
              </span>
            </div>
          </button>

          {activeTool && (
            <div className="hidden sm:flex items-center space-x-2 pl-4 border-l border-slate-200 dark:border-slate-700">
              <button
                onClick={onGoHome}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              hasApiKey
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
            }`}
            title="Đổi hoặc nhập Gemini API Key"
          >
            {hasApiKey ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Gemini API Key: Đã Kích Hoạt</span>
                <span className="sm:hidden">API Key</span>
              </>
            ) : (
              <>
                <Key className="w-4 h-4 text-blue-600" />
                <span>Nhập Gemini API Key</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
