import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Type, 
  Moon, 
  Sun, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  Search, 
  Download, 
  Trash2,
  FileText,
  Clock,
  Menu
} from 'lucide-react';
import { ReferenceDocument } from '../types';

interface DocumentReaderProps {
  document: ReferenceDocument;
  onClose: () => void;
  onDelete?: () => void;
  language: 'AZ' | 'EN';
  associatedName?: string;
}

export default function DocumentReader({
  document,
  onClose,
  onDelete,
  language,
  associatedName
}: DocumentReaderProps) {
  const [fontSize, setFontSize] = useState<number>(14);
  const [theme, setTheme] = useState<'light' | 'warm' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const readerRef = useRef<HTMLDivElement>(null);

  // Word & Reading statistics
  const wordCount = document.content ? document.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = document.content ? document.content.length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 wpm

  // Themes mapping
  const themeStyles = {
    light: 'bg-[#F8FAFC] text-slate-800',
    warm: 'bg-[#FDFBF7] text-[#433422]',
    dark: 'bg-[#0F172A] text-[#E2E8F0]'
  };

  const canvasStyles = {
    light: 'bg-white text-slate-800 shadow-2xl border border-slate-200/60',
    warm: 'bg-[#FAF5EC] text-[#3E2F1E] shadow-2xl border border-[#E4DBC5]',
    dark: 'bg-[#1E293B] text-[#F1F5F9] shadow-2xl border border-[#2E3B4E]'
  };

  // Safe highlighted text rendering
  const renderHighlightedContent = () => {
    if (!document.content) return '';
    
    // Prefer HTML content if search is empty and HTML content exists (uploaded Word file)
    if (!searchQuery.trim()) {
      if (document.htmlContent) {
        return (
          <>
            <style>{`
              .docx-content {
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .docx-content p {
                margin-bottom: 1rem;
                line-height: 1.625;
              }
              .docx-content h1, .docx-content h2, .docx-content h3, .docx-content h4, .docx-content h5, .docx-content h6 {
                font-weight: 800;
                line-height: 1.3;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                color: inherit;
              }
              .docx-content h1 { font-size: 1.5rem; border-b pb-1.5 border-slate-200/40; }
              .docx-content h2 { font-size: 1.3rem; border-b pb-1 border-slate-200/20; }
              .docx-content h3 { font-size: 1.15rem; }
              .docx-content h4 { font-size: 1.05rem; }
              
              .docx-content ul {
                list-style-type: disc;
                padding-left: 1.5rem;
                margin-bottom: 1rem;
              }
              .docx-content ol {
                list-style-type: decimal;
                padding-left: 1.5rem;
                margin-bottom: 1rem;
              }
              .docx-content li {
                margin-bottom: 0.35rem;
                line-height: 1.5;
              }
              .docx-content table {
                width: 100% !important;
                max-width: 100%;
                border-collapse: collapse;
                margin-top: 1.5rem;
                margin-bottom: 1.5rem;
                font-size: 0.85rem;
                overflow-x: auto;
                display: block;
              }
              @media (min-width: 768px) {
                .docx-content table {
                  display: table;
                }
              }
              .docx-content th, .docx-content td {
                border: 1px solid rgba(148, 163, 184, 0.25);
                padding: 0.75rem 1rem;
                text-align: left;
                line-height: 1.5;
                min-width: 100px;
              }
              .docx-content th {
                background-color: rgba(0, 0, 0, 0.03);
                font-weight: 700;
              }
              .docx-content blockquote {
                border-left: 3.5px solid #059669;
                padding-left: 0.875rem;
                margin: 1rem 0;
                font-style: italic;
                opacity: 0.85;
              }
              .dark .docx-content th {
                background-color: rgba(255, 255, 255, 0.05);
              }
            `}</style>
            <div className="docx-content-container overflow-x-auto w-full">
              <div 
                className="docx-content font-sans leading-relaxed text-sm" 
                dangerouslySetInnerHTML={{ __html: document.htmlContent }} 
              />
            </div>
          </>
        );
      }
      return <div className="whitespace-pre-wrap font-sans leading-relaxed text-sm">{document.content}</div>;
    }

    try {
      // Escape regex special chars
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = document.content.split(regex);

      return (
        <div className="whitespace-pre-wrap font-sans leading-relaxed text-sm">
          {parts.map((part, idx) => 
            regex.test(part) ? (
              <mark key={idx} className="bg-yellow-250 text-slate-900 rounded-sm px-0.5 font-semibold">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </div>
      );
    } catch (e) {
      return <div className="whitespace-pre-wrap font-sans leading-relaxed text-sm">{document.content}</div>;
    }
  };

  const handleDownloadTxt = () => {
    const element = window.document.createElement("a");
    const file = new Blob([document.content], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `${document.name}.txt`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  return (
    <div className={`fixed inset-0 z-[999] flex flex-col items-center justify-center ${isFullScreen ? 'p-0' : 'p-4 md:p-8'} bg-slate-950/70 backdrop-blur-sm animate-none overflow-hidden`}>
      <div className={`flex flex-col w-full ${isFullScreen ? 'h-full rounded-none' : 'h-full max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)] rounded-3xl'} max-w-5xl overflow-hidden shadow-2xl ${themeStyles[theme]} transition-colors duration-200`}>
        
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-slate-200/20 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/10 text-emerald-500 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm md:text-base leading-tight truncate max-w-md">
                {document.name}
              </h3>
              <p className="text-[10px] opacity-60 flex items-center gap-2 mt-0.5 font-medium">
                <span>{document.type === 'program' ? (language === 'AZ' ? 'İxtisas Proqramı' : 'Specialty Program') : document.type === 'syllabus' ? (language === 'AZ' ? 'Sillabus Təlimatı' : 'Syllabus Guide') : (language === 'AZ' ? 'Ümumi Qaydalar' : 'General Rules')}</span>
                <span>•</span>
                <span>{document.fileSize || '0 KB'}</span>
              </p>
            </div>
          </div>

          {/* Reader toolbar buttons */}
          <div className="flex items-center flex-wrap gap-2 md:gap-3">
            {/* Font buttons */}
            <div className="flex items-center bg-slate-500/10 p-1 rounded-xl">
              <button 
                onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                title={language === 'AZ' ? 'Şrifti kiçilt' : 'Decrease font size'}
              >
                A-
              </button>
              <div className="px-2 text-xs font-mono font-bold flex items-center gap-1">
                <Type className="w-3 h-3" />
                {fontSize}px
              </div>
              <button 
                onClick={() => setFontSize(prev => Math.min(22, prev + 1))}
                className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                title={language === 'AZ' ? 'Şrifti böyüt' : 'Increase font size'}
              >
                A+
              </button>
            </div>

            {/* Theme switcher */}
            <div className="flex items-center bg-slate-500/10 p-1 rounded-xl">
              <button 
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-emerald-800 shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title={language === 'AZ' ? 'Açıq mövzu' : 'Light theme'}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setTheme('warm')}
                className={`p-1.5 rounded-lg transition-all ${theme === 'warm' ? 'bg-[#FAF5EC] text-[#3E2F1E] shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title={language === 'AZ' ? 'Krem/Parşat' : 'Sepia theme'}
              >
                <span className="text-[10px] font-bold px-0.5">S</span>
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'opacity-60 hover:opacity-100'}`}
                title={language === 'AZ' ? 'Qaranlıq mövzu' : 'Dark theme'}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fullscreen and action buttons */}
            <button 
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 bg-slate-500/10 hover:bg-slate-500/20 rounded-xl transition-all text-xs"
              title={isFullScreen ? (language === 'AZ' ? 'Pəncərə rejimi' : 'Exit fullscreen') : (language === 'AZ' ? 'Tam ekran' : 'Fullscreen')}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button 
              onClick={handleDownloadTxt}
              className="p-2 bg-slate-500/10 hover:bg-slate-500/20 rounded-xl transition-all text-xs flex items-center gap-1.5 font-bold"
              title={language === 'AZ' ? 'Yüklə (.txt)' : 'Download (.txt)'}
            >
              <Download className="w-4 h-4" />
            </button>

            {onDelete && (
              <button 
                onClick={onDelete}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all"
                title={language === 'AZ' ? 'Sil' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 bg-slate-500/20 hover:bg-slate-500/30 text-rose-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar Toolbar */}
        <div className="px-6 py-2.5 bg-slate-500/5 border-b border-slate-200/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={language === 'AZ' ? 'Sənəddə axtar...' : 'Search within document...'}
              className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-slate-300/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium placeholder-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                {language === 'AZ' ? 'Təmizlə' : 'Clear'}
              </button>
            )}
          </div>

          {associatedName && (
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/10 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'AZ' ? 'Əlaqəli:' : 'Assoc:'} {associatedName}</span>
            </div>
          )}
        </div>

        {/* Scrollable Reader Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center bg-slate-500/5">
          <div 
            ref={readerRef}
            style={{ fontSize: `${fontSize}px` }}
            className={`w-full max-w-3xl p-8 md:p-14 rounded-2xl ${canvasStyles[theme]} transition-all duration-150 shadow-lg min-h-[70vh] block`}
          >
            {/* Simulated Printed Header */}
            <div className="border-b-2 border-slate-400/20 pb-4 mb-8 text-center block">
              <h1 className="font-serif font-black text-xl md:text-2xl tracking-wide uppercase block">
                {document.name.replace(/\.[^/.]+$/, "")}
              </h1>
              <p className="text-[11px] uppercase tracking-widest font-mono opacity-60 mt-1.5 block">
                {language === 'AZ' ? 'ONLAYN MÜTALİƏ STANDARTI' : 'ONLINE READING EDITION'}
              </p>
            </div>

            {/* Document Content */}
            <div className="my-6 block">
              {renderHighlightedContent()}
            </div>

            {/* Simulated Printed Footer */}
            <div className="border-t-2 border-slate-400/10 pt-4 mt-12 text-center text-[10px] font-mono opacity-40 block">
              {language === 'AZ' ? 'Dövlət Universitetləri Tədris Standartı' : 'State University Curriculum Standard'}
            </div>
          </div>
        </div>

        {/* Bottom Status Statistics Bar */}
        <div className="px-6 py-3 border-t border-slate-200/20 bg-slate-500/10 flex items-center justify-between text-[11px] font-mono opacity-75">
          <div className="flex items-center gap-4">
            <span>{language === 'AZ' ? 'Söz sayı:' : 'Words:'} <strong className="font-bold">{wordCount}</strong></span>
            <span>{language === 'AZ' ? 'Simvol:' : 'Chars:'} <strong className="font-bold">{charCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>~{readingTime} {language === 'AZ' ? 'dəq. mütaliə' : 'min. read'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
