'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, ShieldCheck, AlertCircle, ChevronDown, List, Brain, MessageSquareHeart, GraduationCap } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import FeedbackModal from '../components/ui/FeedbackModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Citation {
  source: string;
  page: string;
  file_name: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isSufficient?: boolean;
  confidence?: number;
  reason?: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New States for Sidebar
  const [subject, setSubject] = useState('Community Medicine');
  const [intent, setIntent] = useState('Revise');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: input,
          subject: subject,
          intent: intent
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🚨 Backend Error Details:", errorText);
        throw new Error(`Server Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        isSufficient: data.is_sufficient,
        confidence: data.confidence,
        reason: data.validation_reason,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for dynamic greeting
  const getWelcomeMessage = () => {
    if (intent === 'Test') return `Hey future doctor! Ready to test your knowledge in ${subject}? Fire away!`;
    if (intent === 'Notes') return `Let's make some high-yield notes for ${subject}. What topic should we summarize?`;
    return `Hey future doctor! Ready to conquer ${subject}? Select an intent and ask me a question!`;
  };

  // Helper for placeholder
  const getPlaceholder = () => {
    if (subject === 'Community Medicine') return "Ask about Park's epidemiology triad...";
    if (subject === 'Forensic Medicine') return "Ask about rigor mortis timeline...";
    if (subject === 'Ophthalmology') return "Ask about stages of diabetic retinopathy...";
    return `Ask a question about ${subject}...`;
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
      
      {/* Sidebar - Desktop Only */}
      <Sidebar 
        subject={subject} 
        setSubject={setSubject} 
        intent={intent} 
        setIntent={setIntent} 
      />

      <main className="flex flex-col flex-1 relative overflow-hidden">
        {/* Background ambient gradient */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none" />

        {/* Header - Glassmorphism */}
        <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 md:hidden">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 leading-tight">AcaDoc AI</h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium tracking-wide hidden md:block">TEXTBOOK GROUNDED INTELLIGENCE</p>
              <p className="text-[10px] md:hidden text-blue-600 font-bold">{subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200/50 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Answers
            </span>
            <button 
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full text-xs font-semibold transition-all border border-blue-100"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" />
              <span className="hidden md:block">Feedback</span>
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scroll-smooth z-0"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto text-center space-y-6 md:space-y-8 px-2 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-[40px] opacity-20 rounded-full" />
                <div className="relative p-5 md:p-6 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50">
                  <GraduationCap className="w-10 h-10 md:w-14 md:h-14 text-blue-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{getWelcomeMessage()}</h2>
                <p className="mt-3 md:mt-4 text-sm md:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Your answers will be strictly grounded in authoritative textbooks. No hallucinations, just reliable medical literature.
                </p>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-4">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[90%] md:max-w-[80%] space-y-2.5`}>
                  
                  {/* Intent Badge for Assistant Responses in Revise Mode */}
                  {m.role === 'assistant' && intent === 'Revise' && i === messages.length - 1 && (
                    <div className="flex mb-1 ml-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-100 shadow-sm">
                        Exam Mode Active: LAQ Format
                      </span>
                    </div>
                  )}

                  <div className={`px-5 py-4 shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl rounded-tr-sm shadow-blue-500/20' 
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-3xl rounded-tl-sm shadow-slate-200/50'
                  }`}>
                    <div className={`whitespace-pre-wrap leading-relaxed text-sm md:text-base ${m.role === 'assistant' ? 'prose prose-slate prose-sm md:prose-base max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-p:leading-relaxed' : ''}`}>
                      {m.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>

                  {m.role === 'assistant' && (
                    <div className="space-y-2.5 px-1">
                      {/* Validation Badge */}
                      {m.confidence !== undefined && (
                        <div className="flex items-center">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wide border ${
                            m.isSufficient 
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-100' 
                              : 'text-amber-700 bg-amber-50 border-amber-100'
                          }`}>
                            {m.isSufficient ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {m.isSufficient ? `Verified Context (${Math.round(m.confidence * 100)}%)` : 'Insufficient Evidence'}
                          </div>
                        </div>
                      )}

                      {/* Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.citations.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] md:text-xs font-medium border border-slate-200/60 shadow-sm">
                              <List className="w-3 h-3 text-slate-400" />
                              {c.file_name} <span className="text-slate-400">|</span> p.{c.page}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in">
                <div className="px-5 py-4 bg-white border border-slate-200/80 rounded-3xl rounded-tl-sm shadow-sm flex gap-2 items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Glassmorphism */}
        <div className="p-3 md:p-6 bg-white/70 backdrop-blur-lg border-t border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-10">
          <form 
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto flex items-end gap-2 relative"
          >
            <div className="relative flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={getPlaceholder()}
                className="w-full pl-4 md:pl-5 pr-14 py-3.5 md:py-4 bg-transparent rounded-2xl focus:outline-none resize-none min-h-[52px] md:min-h-[60px] max-h-[150px] text-sm md:text-base text-slate-800"
                rows={1}
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bottom-2 md:right-2.5 md:bottom-2.5 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-md hover:shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </form>
          <p className="mt-2 md:mt-3 text-[10px] md:text-xs text-center text-slate-400 font-medium">
            AcaDoc AI is for educational purposes. Verify clinical decisions with source textbooks.
          </p>
        </div>
      </main>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}
