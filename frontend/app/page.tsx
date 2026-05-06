'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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

import { Suspense } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New States for Sidebar & Token Management
  const [subject, setSubject] = useState(searchParams.get('subject') || 'Community Medicine');
  const [intent, setIntent] = useState('Revise');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  
  // Token Management States (§11)
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null);
  const [totalQuota, setTotalQuota] = useState<number | null>(null);
  const [quotaAlert, setQuotaAlert] = useState<'none' | 'warning' | 'hard-stop'>('none');

  useEffect(() => {
    const s = searchParams.get('subject');
    if (s) setSubject(s);
  }, [searchParams]);

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

      // Update Token Management State (§11)
      if (data.tokens_remaining !== undefined) {
        setTokensRemaining(data.tokens_remaining);
        setTotalQuota(data.total_quota);
        
        // 🚨 Hard Stop Logic
        if (data.is_allowed === false) {
          setQuotaAlert('hard-stop');
        } 
        // 🩺 Smart Threshold Logic ( < 15% remaining)
        else if (data.tokens_remaining < (data.total_quota * 0.15)) {
          setQuotaAlert('warning');
        }
      }

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
    if (intent === 'Test') return `Testing: ${subject}`;
    if (intent === 'Notes') return `Summarizing: ${subject}`;
    return `Conquering ${subject}`;
  };

  // Helper for placeholder
  const getPlaceholder = () => {
    if (subject === 'Community Medicine') return "Ask about Park's epidemiology triad...";
    if (subject === 'Forensic Medicine') return "Ask about rigor mortis timeline...";
    return `Ask a question about ${subject}...`;
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent">

      {/* Sidebar - Desktop Only */}
      <Sidebar
        subject={subject}
        setSubject={setSubject}
        intent={intent}
        setIntent={setIntent}
      />

      <main className="flex flex-col flex-1 relative overflow-hidden md:pl-24">
        {/* Header - Glassmorphism */}
        <header className="flex items-center justify-between px-8 h-16 bg-slate-950/40 backdrop-blur-[20px] border-b border-white/10 z-50 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary tracking-tighter font-manrope antialiased tracking-wide">AcaDoc AI</h1>
            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
            <span className="font-label-caps hidden md:block text-xs">{subject} • {intent}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider rounded-full border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Answers
            </span>
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="text-slate-400 hover:bg-white/5 hover:text-primary transition-all p-2 rounded-full"
            >
              <MessageSquareHeart className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 scroll-smooth z-10"
        >
          {messages.length === 0 && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 mt-4">
              <header>
                <h2 className="font-h1 text-on-surface mb-1 text-3xl">{getWelcomeMessage()}</h2>
                <p className="font-body-lg text-on-surface-variant max-w-2xl text-sm">
                  Access textbook-grounded medical intelligence. Your answers are strictly derived from verified sources to ensure zero hallucination.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'High Yield', desc: 'Focus on most relevant exam topics', icon: Brain },
                  { title: 'Deterministic', desc: 'Page-level citations for every fact', icon: BookOpen },
                  { title: 'Safe', desc: 'Halts when evidence is insufficient', icon: ShieldCheck }
                ].map((card, i) => (
                  <div key={i} className="glass-card rounded-xl p-5 glow-hover transition-all duration-300 flex flex-col h-[150px]">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mb-3 border border-primary/20">
                      <card.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-h2 text-base mb-1">{card.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-6 pb-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[90%] md:max-w-[85%] space-y-2`}>

                  {m.role === 'user' ? (
                    <div className="px-5 py-3 bg-primary text-white rounded-2xl rounded-tr-sm shadow-lg shadow-primary/20 font-medium text-sm md:text-base">
                      {m.content}
                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl rounded-tl-sm p-5 space-y-3">
                      <div className="leading-relaxed text-sm md:text-base prose prose-invert max-w-none text-slate-200 prose-headings:font-bold prose-a:text-blue-400 prose-p:leading-relaxed prose-strong:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>

                      {/* Validation & Citations */}
                      <div className="pt-3 border-t border-white/5 space-y-2">
                        {m.confidence !== undefined && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${m.isSufficient
                            ? 'text-emerald-400 border-emerald-400/20'
                            : 'text-amber-400 border-amber-400/20'
                            }`}>
                            {m.isSufficient ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {m.isSufficient ? `Verified (${Math.round(m.confidence * 100)}%)` : 'Insufficient Evidence'}
                          </div>
                        )}

                        {m.citations && m.citations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.citations.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 text-slate-400 rounded-md text-[9px] font-bold border border-white/5">
                                <List className="w-2.5 h-2.5" />
                                {c.file_name} • p.{c.page}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in">
                <div className="glass-card px-5 py-3 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Glassmorphism */}
        <div className="p-4 bg-slate-950/40 backdrop-blur-lg border-t border-white/10 z-50">
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative"
          >
            <div className="glass-card rounded-3xl p-1 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
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
                className="w-full pl-5 pr-14 py-3 bg-transparent rounded-xl focus:outline-none resize-none min-h-[48px] max-h-[150px] text-slate-200 placeholder-slate-500 text-sm"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bottom-2 p-2.5 bg-primary text-white rounded-lg hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="mt-3 text-[9px] text-center text-slate-500 font-bold uppercase tracking-[0.2em]">
            AcaDoc AI • Curriculum Grounded • Zero Hallucination
          </p>
        </div>

        {/* Token Management Alerts (§11) */}
        {quotaAlert !== 'none' && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`max-w-md w-full glass-card p-8 border-2 ${quotaAlert === 'hard-stop' ? 'border-red-500/50' : 'border-amber-500/50'} space-y-6 text-center shadow-2xl`}>
              <div className="flex justify-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${quotaAlert === 'hard-stop' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  {quotaAlert === 'hard-stop' ? <AlertCircle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-xl font-bold ${quotaAlert === 'hard-stop' ? 'text-red-400' : 'text-amber-400'}`}>
                  {quotaAlert === 'hard-stop' ? '⛔ Access Paused' : '🩺 Academic Resource Alert'}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {quotaAlert === 'hard-stop' 
                    ? "Your daily curriculum allotment is reached. Access to the Medical Intelligence Suite will reset at midnight."
                    : "Your current session is nearing its capacity. You have enough for approximately 2 more clinical queries."}
                </p>
              </div>

              {quotaAlert === 'warning' && (
                <button 
                  onClick={() => setQuotaAlert('none')}
                  className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-amber-500/30"
                >
                  Acknowledge & Continue
                </button>
              )}

              {quotaAlert === 'hard-stop' && (
                <button 
                  onClick={() => window.location.href = 'https://acadocai.com'}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><span className="animate-pulse text-primary font-bold">Initializing AcaDoc...</span></div>}>
      <HomeContent />
    </Suspense>
  );
}

