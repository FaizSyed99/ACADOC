'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, Menu, Brain, CheckCircle, AlertCircle, FileText, Activity, PlusCircle } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import FeedbackModal from '../components/ui/FeedbackModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

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

export const SUBJECTS = [
  "Community Medicine",
  "Forensic Medicine",
  "Ophthalmology",
  "ENT"
];

import { Suspense } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [subject, setSubject] = useState(searchParams.get('subject') || 'Community Medicine');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(searchParams.get('session'));
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [feedbackAnswerId, setFeedbackAnswerId] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Generate a simple unique session ID for memory caching
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    const s = searchParams.get('subject');
    const sess = searchParams.get('session');
    
    if (s) setSubject(s);
    
    if (sess && sess !== currentSessionId) {
      setCurrentSessionId(sess);
      setIsLoading(true);
      fetch(`/api/sessions/${sess}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else if (!sess && currentSessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent, predefinedInput?: string) => {
    e.preventDefault();
    const queryText = predefinedInput || input;
    if (!queryText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMessage]);
    if (!predefinedInput) setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    let sessionId = currentSessionId;
    
    // GA4 Tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'message_send', {
        event_category: 'chat',
        event_label: subject,
      });
    }

    if (!sessionId && messages.length === 0) {
      try {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, intent: 'Revise', summary: queryText.substring(0, 50) + "..." })
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          sessionId = sessionData.session?.id;
          setCurrentSessionId(sessionId);
          window.history.pushState(null, '', `/?subject=${encodeURIComponent(subject)}&session=${sessionId}`);
        }
      } catch (e) {
        console.error("Failed to create session", e);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          subject: subject,
          intent: 'Revise',
          user_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`Server Error ${response.status}`);
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

      if (sessionId) {
        fetch(`/api/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        }).catch(console.error);

        fetch(`/api/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: assistantMessage })
        }).catch(console.error);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "An error occurred while connecting to the medical intelligence server. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-surface-cream overflow-hidden selection:bg-primary/20 selection:text-primary-dark">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-white/90 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-surface-on-surface-variant hover:text-surface-on-surface rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="font-serif text-primary font-bold">A</span>
              </div>
              <span className="font-serif font-bold text-surface-on-surface text-lg">AcaDoc AI</span>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 flex justify-center">
            <select 
              value={subject}
              onChange={(e) => {
                const newSubject = e.target.value;
                setSubject(newSubject);
                if (typeof window !== 'undefined' && (window as any).gtag) {
                  (window as any).gtag('event', 'subject_change', {
                    event_category: 'navigation',
                    event_label: newSubject,
                  });
                }
              }}
              className="border border-border-subtle bg-white text-surface-on-surface rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-primary shadow-sm appearance-none cursor-pointer w-full max-w-[240px] text-center"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              {SUBJECTS.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <button 
              onClick={() => {
                router.push('/');
                setMessages([]);
                setCurrentSessionId(null);
              }}
              className="hidden sm:flex bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors items-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Chat
            </button>
          </div>
        </header>

        {/* Chat Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[200px] scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 flex flex-col gap-6">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border border-primary/20 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
                  <Activity className="w-12 h-12 text-primary opacity-80" />
                </div>
                <h1 className="font-serif text-3xl lg:text-4xl font-bold text-surface-on-surface mb-3">Welcome to AcaDoc AI</h1>
                <p className="text-surface-on-surface-variant max-w-md mb-10 text-[15px] leading-relaxed">
                  Ask textbook-grounded questions about {subject.toLowerCase() || 'any medical topic'}. Every answer is verified against clinical literature.
                </p>
                <div className="flex flex-wrap justify-center gap-3 max-w-2xl hidden sm:flex">
                  {[
                    "What is drowning?",
                    "Explain wet vs dry drowning",
                    "Define immersion syndrome"
                  ].map((chip) => (
                    <button 
                      key={chip}
                      onClick={(e) => handleSubmit(e, chip)}
                      className="bg-white border border-border-subtle rounded-full px-5 py-2.5 text-sm text-surface-on-surface-variant hover:border-primary hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex w-full animate-in fade-in slide-in-from-bottom-3 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    relative group
                    ${msg.role === 'user' 
                      ? 'bg-primary text-white max-w-[85%] lg:max-w-[70%] rounded-[16px] rounded-tr-[4px] px-[18px] py-[14px] shadow-[0_4px_12px_rgba(13,148,136,0.15)]' 
                      : 'bg-white border border-border-subtle max-w-[95%] lg:max-w-[85%] rounded-[16px] rounded-tl-[4px] p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-surface-on-surface'
                    }
                  `}>
                    {/* Verified Badge for AI */}
                    {msg.role === 'assistant' && msg.isSufficient !== undefined && (
                      <div className="flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-3">
                        {msg.isSufficient ? (
                          <div className="flex items-center gap-1.5 bg-semantic-success/10 text-semantic-success px-2.5 py-1 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>AI Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Partial Context</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`prose max-w-none text-[15px] leading-relaxed ${msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate text-surface-on-surface'} 
                      prose-headings:font-serif prose-headings:font-bold prose-headings:mb-3
                      prose-p:mb-3 last:prose-p:mb-0
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-li:marker:text-primary
                      prose-code:bg-slate-50 prose-code:border prose-code:border-slate-200 prose-code:rounded-lg prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-slate-800
                      prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800 prose-pre:shadow-none
                    `}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Citations block */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-border-subtle">
                        <div className="flex items-center gap-1.5 mb-3">
                          <FileText className="w-4 h-4 text-surface-on-surface-variant" />
                          <span className="text-xs uppercase tracking-wider font-semibold text-surface-on-surface-variant">Sources</span>
                        </div>
                        <div className="space-y-2">
                          {msg.citations.map((cite, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                if (typeof window !== 'undefined' && (window as any).gtag) {
                                  (window as any).gtag('event', 'citation_click', {
                                    event_category: 'interaction',
                                    event_label: cite.source,
                                  });
                                }
                              }}
                              className="bg-slate-50 border border-slate-100 rounded-lg p-3 hover:bg-slate-100 transition-colors cursor-pointer group/cite flex items-start gap-3"
                            >
                              <div className="bg-white border border-slate-200 text-slate-500 w-6 h-6 rounded flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 group-hover/cite:border-primary group-hover/cite:text-primary transition-colors">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{cite.source}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">Page {cite.page} • {cite.file_name.replace('.pdf', '')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex w-full justify-start animate-in fade-in duration-300">
                <div className="bg-white border border-border-subtle rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-1.5 w-[72px] h-[52px]">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border-subtle p-4 lg:p-6 pb-6 lg:pb-8">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSubmit}
              className="relative bg-white border border-border-subtle rounded-2xl p-2 lg:p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200"
            >
              <div className="flex items-end gap-2 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask a medical question... (e.g., 'What is drowning?')`}
                  className="w-full max-h-[200px] min-h-[44px] bg-transparent border-none outline-none resize-none py-2.5 px-3 lg:px-4 text-[15px] leading-relaxed text-surface-on-surface placeholder:text-slate-400 font-sans"
                  rows={1}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark hover:scale-105 disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </form>
            <div className="text-center mt-3">
              <span className="text-xs text-slate-400 font-medium tracking-wide">
                AcaDoc AI can make mistakes. Verify critical medical information.
              </span>
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        answerId={feedbackAnswerId || ""} 
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-surface-cream">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
