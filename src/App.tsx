import React, { useState, useEffect } from 'react';
import { ToolId } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeGrid } from './components/HomeGrid';
import { ApiKeyModal, STORAGE_KEY } from './components/ApiKeyModal';
import { ToolSplitPdf } from './components/tools/ToolSplitPdf';
import { ToolMergePdf } from './components/tools/ToolMergePdf';
import { ToolRemoveBlankPages } from './components/tools/ToolRemoveBlankPages';
import { ToolPdfToWord } from './components/tools/ToolPdfToWord';
import { ToolPdfToExcel } from './components/tools/ToolPdfToExcel';
import { ToolWordToPdf } from './components/tools/ToolWordToPdf';
import { ToolExcelToPdf } from './components/tools/ToolExcelToPdf';
import { ToolEditPdf } from './components/tools/ToolEditPdf';
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
      case 'pdf-to-word':
        return <ToolPdfToWord onBack={() => setActiveTool(null)} hasApiKey={!!apiKey} />;
      case 'pdf-to-excel':
        return <ToolPdfToExcel onBack={() => setActiveTool(null)} />;
      case 'word-to-pdf':
        return <ToolWordToPdf onBack={() => setActiveTool(null)} />;
      case 'excel-to-pdf':
        return <ToolExcelToPdf onBack={() => setActiveTool(null)} />;
      case 'edit-pdf':
        return <ToolEditPdf onBack={() => setActiveTool(null)} />;
      default:
        return <HomeGrid onSelectTool={(id) => setActiveTool(id)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200">
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
