import React, { useState, useEffect } from 'react';
import { ToolId } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeGrid } from './components/HomeGrid';
import { ApiKeyModal, STORAGE_KEY } from './components/ApiKeyModal';
import { ToolSplitPdf } from './components/tools/ToolSplitPdf';
import { ToolMergePdf } from './components/tools/ToolMergePdf';
import { ToolRemoveBlankPages } from './components/tools/ToolRemoveBlankPages';
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
      default:
        return <HomeGrid onSelectTool={(id) => setActiveTool(id)} />;
    }
  };

    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-rose-500 selection:text-white transition-colors duration-200 animated-gradient-bg relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="absolute -bottom-40 -right-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-6000"></div>
      </div>
      {/* Header */}
      <Header
        activeTool={activeTool}
        onGoHome={() => setActiveTool(null)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={!!apiKey}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
        <ErrorBoundary>
          {renderActiveTool()}
        </ErrorBoundary>
      </main>

      {/* Fixed Copyright Footer */}
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
