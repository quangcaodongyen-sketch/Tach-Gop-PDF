import React, { useState, useEffect } from 'react';
import { ToolId } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeGrid } from './components/HomeGrid';
import { ApiKeyModal, STORAGE_KEY } from './components/ApiKeyModal';
import { ToolSplitPdf } from './components/tools/ToolSplitPdf';
import { ToolMergePdf } from './components/tools/ToolMergePdf';
import { ToolRemoveBlankPages } from './components/tools/ToolRemoveBlankPages';
import { ToolRotatePdf } from './components/tools/ToolRotatePdf';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY) || '';
    setApiKey(savedKey);
  }, []);

  const handleKeySaved = (newKey: string) => {
    setApiKey(newKey);
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'split':
        return <ToolSplitPdf onBack={() => setActiveTool(null)} />;
      case 'merge':
        return <ToolMergePdf onBack={() => setActiveTool(null)} />;
      case 'remove-blank':
        return <ToolRemoveBlankPages onBack={() => setActiveTool(null)} />;
      case 'rotate':
        return <ToolRotatePdf onBack={() => setActiveTool(null)} />;
      default:
        return <HomeGrid onSelectTool={(id) => setActiveTool(id)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200 bg-grid-pattern relative overflow-x-hidden">
      {/* Dynamic Glow Orbs Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-[140px] animate-pulseGlow"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-pink-600/25 to-rose-600/25 rounded-full blur-[140px] animate-pulseGlow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-teal-600/20 to-emerald-600/20 rounded-full blur-[150px] animate-pulseGlow" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <Header
        activeTool={activeTool}
        onGoHome={() => setActiveTool(null)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={!!apiKey}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16 relative z-10">
        <ErrorBoundary>
          {renderActiveTool()}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer />

      {/* Gemini API Key Settings Dialog */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={handleKeySaved}
      />
    </div>
  );
}


