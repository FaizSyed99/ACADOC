import React from 'react';
import { BookOpen, FileText } from 'lucide-react';

interface MemoryCardProps {
  content: string;
  color?: string;
  source?: string;
}

const DEFAULT_COLOR = "#0D9488"; // Teal

// Helper to parse inline markdown bold (**text**)
const parseInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

export default function MemoryCard({ content, color = DEFAULT_COLOR, source }: MemoryCardProps) {
  // Defensive check for empty content
  if (!content || !content.trim()) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-sm">
        No mnemonic available.
      </div>
    );
  }

  try {
    // 1. Remove raw <MemoryCard> tags if they exist in the content string
    let cleanContent = content.replace(/<MemoryCard[^>]*>|<\/MemoryCard>/g, '').trim();

    // 2. Extract Source if it's explicitly written in the text
    let extractedSource = source;
    const sourceMatch = cleanContent.match(/Source:\s*(.+)$/i);
    if (sourceMatch) {
      extractedSource = sourceMatch[1].trim();
      cleanContent = cleanContent.replace(sourceMatch[0], '').trim();
    }

    // 3. Extract Title
    // We assume the first line (or text before the first `*`) is the title
    const firstAsteriskIndex = cleanContent.indexOf('*');
    let title = "Mnemonic";
    if (firstAsteriskIndex > 0) {
      title = cleanContent.substring(0, firstAsteriskIndex).replace(/\*\*/g, '').trim();
      cleanContent = cleanContent.substring(firstAsteriskIndex).trim();
    } else if (firstAsteriskIndex === -1 && cleanContent) {
      // No list items, just a title or plain text
      title = cleanContent.replace(/\*\*/g, '').trim();
      cleanContent = "";
    }

    // 4. Parse List Items
    const items = cleanContent.split('*').map(item => item.trim()).filter(Boolean);
    const parsedItems = items.map(item => {
      // Item format usually: "D: Diatoms in tissues" or "**D**: Diatoms"
      const colonIndex = item.indexOf(':');
      if (colonIndex > -1) {
        let letter = item.substring(0, colonIndex).replace(/\*\*/g, '').trim();
        let desc = item.substring(colonIndex + 1).trim();
        return { letter, desc };
      }
      return { letter: '•', desc: item };
    });

    const headerBgColor = color || DEFAULT_COLOR;

    return (
      <article 
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] w-full max-w-[600px] my-4 group"
        aria-label={`Mnemonic: ${title}`}
      >
        {/* Header */}
        <div 
          className="px-4 py-4 sm:px-5 sm:py-4 flex items-center gap-3"
          style={{ backgroundColor: headerBgColor }}
        >
          <BookOpen className="w-5 h-5 text-white opacity-90 shrink-0" />
          <h3 className="text-white font-serif text-base sm:text-[18px] font-bold flex-1 truncate">
            {title}
          </h3>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-white shrink-0">
            Mnemonic
          </span>
        </div>

        {/* Content Body */}
        <div className="bg-[#FAFAF8] p-4 sm:p-5 border-b border-slate-200">
          <ul className="space-y-3">
            {parsedItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs sm:text-[14px] animate-[pulse_1s_ease-out]"
                  style={{ backgroundColor: headerBgColor }}
                >
                  {item.letter}
                </div>
                <div className="flex-1 font-sans text-[13px] sm:text-[14px] text-slate-700 leading-[1.6]">
                  {parseInlineMarkdown(item.desc)}
                </div>
              </li>
            ))}
            {parsedItems.length === 0 && (
              <p className="text-sm text-slate-500 italic">No detailed items found.</p>
            )}
          </ul>
        </div>

        {/* Footer (Source) */}
        {extractedSource && (
          <div 
            className="bg-white px-4 py-3 sm:px-5 sm:py-[14px] flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer group/source"
            aria-label={`Source: ${extractedSource}`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-semibold leading-tight">
                Source
              </span>
              <span className="text-[13px] sm:text-[14px] text-slate-600 italic group-hover/source:opacity-80 transition-opacity">
                {extractedSource}
              </span>
            </div>
          </div>
        )}
      </article>
    );
  } catch (error) {
    // Fallback if parsing fails catastrophically
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm font-mono whitespace-pre-wrap">
        {content}
      </div>
    );
  }
}
