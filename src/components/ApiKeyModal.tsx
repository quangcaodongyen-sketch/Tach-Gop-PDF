import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, HelpCircle, Check, Copy, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export const STORAGE_KEY = 'pdfpro_gemini_api_key';

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    setApiKey(stored);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanKey = apiKey.trim();
    if (cleanKey) {
      localStorage.setItem(STORAGE_KEY, cleanKey);
      if (onKeySaved) onKeySaved(cleanKey);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      if (onKeySaved) onKeySaved('');
      onClose();
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem(STORAGE_KEY);
    if (onKeySaved) onKeySaved('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Cấu hình Gemini API Key</h3>
              <p className="text-xs text-blue-100">Kích hoạt AI hỗ trợ chuyển đổi PDF chính xác cao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm flex items-center space-x-2 animate-fadeIn">
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>Đã lưu API Key thành công trên trình duyệt (Local Storage)!</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Nhập Gemini API Key của bạn:
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-slate-100 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline" />
              <span>API Key chỉ được lưu an toàn trên trình duyệt của bạn (Local Storage). Không tải lên máy chủ.</span>
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Lấy API Key miễn phí</span>
            </a>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Ẩn hướng dẫn' : 'Hướng dẫn lấy API Key'}</span>
            </button>
          </div>

          {/* Guide box */}
          {showGuide && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 space-y-2 animate-fadeIn">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-1.5">
                <span>Các bước lấy API Key từ Google AI Studio:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>Đăng nhập tài khoản Google của bạn.</li>
                <li>
                  Nhấp vào nút <strong className="text-blue-600 dark:text-blue-400">Create API Key</strong> trong trang Google AI Studio.
                </li>
                <li>Sao chép mã API Key được tạo ra.</li>
                <li>Dán mã API Key vào ô nhập liệu ở trên.</li>
                <li>
                  Nhấn <strong className="text-emerald-600 dark:text-emerald-400">Lưu API Key</strong> để lưu trên trình duyệt (Local Storage).
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClearKey}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              Đổi API Key (Xóa)
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu API Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
