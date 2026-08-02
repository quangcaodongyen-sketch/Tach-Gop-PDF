import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80 py-5 px-6 text-center shadow-lg relative z-20 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bảo mật tuyệt đối • Xử lý PDF ngay trên thiết bị của bạn</span>
        </div>
        <p className="font-bold text-slate-200 tracking-wide flex items-center justify-center space-x-1">
          <span>Bản quyền © Đinh Văn Thành – 0915.213717</span>
        </p>
      </div>
    </footer>
  );
};

