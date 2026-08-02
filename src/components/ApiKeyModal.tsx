import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, HelpCircle, Check, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export const STORAGE_KEY = 'pdfpro_gemini_api_key';

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-xl overflow-hidden transition-all relative">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight">Cấu Hình Gemini API Key</h3>
              <p className="text-xs text-indigo-100 font-medium">Tự quản lý API Key cá nhân nhanh chóng & bảo mật</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>Đã lưu API Key thành công trên trình duyệt (Local Storage)!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Nhập Gemini API Key của bạn:
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-11 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-white text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline-block flex-shrink-0" />
              <span>API Key chỉ lưu an toàn trong trình duyệt (Local Storage). Không gửi tới máy chủ khác.</span>
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-xs font-bold text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-3.5 py-2 rounded-xl border border-pink-500/30 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Link Lấy API Key Miễn Phí (Google AI Studio)</span>
            </a>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showGuide ? 'Ẩn hướng dẫn' : 'Hướng dẫn lấy API Key'}</span>
            </button>
          </div>

          {/* Detailed Guide Box */}
          {showGuide && (
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 animate-fadeIn">
              <h4 className="font-bold text-white mb-2 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Hướng dẫn 4 bước lấy API Key từ Google AI Studio:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-300 pl-1">
                <li>
                  Nhấp vào nút <strong className="text-pink-400">Link Lấy API Key Miễn Phí</strong> ở trên (hoặc truy cập <code className="text-cyan-300">aistudio.google.com/app/apikey</code>).
                </li>
                <li>Đăng nhập bằng tài khoản Google (Gmail) của bạn.</li>
                <li>
                  Nhấn nút <strong className="text-indigo-400">Create API Key</strong> (Tạo API Key mới).
                </li>
                <li>
                  Sao chép chuỗi mã bắt đầu bằng <code className="text-amber-300">AIzaSy...</code> dán vào ô nhập ở trên và bấm <strong className="text-emerald-400">Lưu API Key</strong>.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClearKey}
              className="px-3.5 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors border border-rose-500/20"
            >
              Xóa API Key
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center space-x-1.5"
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
