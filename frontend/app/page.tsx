'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, Menu, Activity, Plus, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import FeedbackModal from '../components/ui/FeedbackModal';
import MemoryCard from '../components/ui/MemoryCard';
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

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [subject, setSubject] = useState(searchParams.get('subject') || 'Community Medicine');
  const [intent, setIntent] = useState('Revise');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(searchParams.get('session'));
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [feedbackAnswerId, setFeedbackAnswerId] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    const s = searchParams.get('subject');
    const sess = searchParams.get('session');
    
    if (s) setSubject(s);
    else if (!s && !sess) router.push('/subjects');
    
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

    let currentSessId = currentSessionId;
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'message_send', {
        event_category: 'chat',
        event_label: subject,
      });
    }

    if (!currentSessId && messages.length === 0) {
      try {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, intent, summary: queryText.substring(0, 50) + "..." })
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          currentSessId = sessionData.session?.id;
          setCurrentSessionId(currentSessId);
          window.history.pushState(null, '', `/?subject=${encodeURIComponent(subject)}&session=${currentSessId}`);
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
          intent: intent,
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

      if (currentSessId) {
        fetch(`/api/sessions/${currentSessId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage })
        }).catch(console.error);

        fetch(`/api/sessions/${currentSessId}`, {
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
    <div className="flex h-[100dvh] bg-[#FAFAF8] overflow-hidden selection:bg-primary/20 selection:text-primary-dark relative">
      
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px)`,
        backgroundSize: '48px 48px'
      }} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} intent={intent} setIntent={setIntent} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
        {/* Header */}
        <header className="sticky top-0 z-30 h-[64px] lg:h-[72px] bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center">
            <button 
              className="lg:hidden w-[44px] h-[44px] flex items-center justify-center -ml-2 text-slate-700 hover:text-slate-900 rounded-lg active:bg-slate-100 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-3 lg:ml-0 ml-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-serif text-primary font-bold">A</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-slate-900 leading-tight">AcaDoc AI</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden lg:block leading-tight">Medical Intelligence</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              router.push('/');
              setMessages([]);
              setCurrentSessionId(null);
            }}
            className="flex items-center justify-center gap-2 bg-[#0D9488] text-white rounded-xl font-medium hover:bg-[#0F766E] transition-colors w-[44px] h-[44px] lg:w-auto lg:px-4 lg:py-2.5"
            aria-label="New Chat"
          >
            <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden lg:inline text-sm">New Chat</span>
          </button>
        </header>

        {/* Chat Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[180px] lg:pb-[200px] scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 py-4 lg:px-6 lg:py-8 flex flex-col gap-4 lg:gap-5">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
                <div className="w-20 h-20 lg:w-28 lg:h-28 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                  <Activity className="w-10 h-10 lg:w-14 lg:h-14 text-primary opacity-20" />
                </div>
                <h1 className="font-serif text-2xl lg:text-3xl font-bold text-slate-900 mb-3">Welcome to AcaDoc AI</h1>
                <p className="text-sm lg:text-base text-slate-600 max-w-md mb-8">
                  Ask textbook-grounded questions about {subject.toLowerCase()}. Every answer is verified against clinical literature.
                </p>
                
                <div className="flex w-full overflow-x-auto snap-x hide-scrollbar sm:flex-wrap sm:justify-center pb-4 lg:pb-0">
                  <div className="flex sm:flex-wrap gap-2 px-2 min-w-max sm:min-w-0 sm:justify-center">
                    {[
                      "What is drowning?",
                      "Explain wet vs dry drowning",
                      "Define immersion syndrome"
                    ].map((chip) => (
                      <button 
                        key={chip}
                        onClick={(e) => handleSubmit(e, chip)}
                        className="snap-center bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm text-slate-600 hover:border-primary hover:text-primary transition-colors min-h-[44px] flex-shrink-0"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    relative group flex flex-col
                    ${msg.role === 'user' 
                      ? 'bg-[#0D9488] text-white max-w-[85%] lg:max-w-[75%] rounded-[16px] rounded-tr-[4px] px-[16px] py-[12px] lg:px-[18px] lg:py-[14px] shadow-[0_2px_8px_rgba(13,148,136,0.2)]' 
                      : 'bg-[#FFFFFF] border border-[#E2E8F0] max-w-[90%] lg:max-w-[80%] rounded-[16px] rounded-tl-[4px] px-[16px] py-[14px] lg:px-[20px] lg:py-[16px] shadow-[0_2px_6px_rgba(0,0,0,0.04)] text-slate-900'
                    }
                  `}>
                    {/* Verified Badge for AI */}
                    {msg.role === 'assistant' && msg.isSufficient !== undefined && (
                      <div className="absolute -top-3 right-4 bg-white rounded-full px-2.5 py-1 border border-slate-200 shadow-sm flex items-center gap-1.5 h-[28px]">
                        <div className={`w-2 h-2 rounded-full ${msg.isSufficient ? 'bg-semantic-success' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {msg.isSufficient ? 'AI Verified' : 'Partial'}
                        </span>
                      </div>
                    )}

                    <div className={`prose max-w-none text-[15px] leading-[1.6] ${msg.role === 'user' ? 'prose-invert text-white' : 'prose-slate text-slate-900'} 
                      prose-headings:font-serif prose-headings:font-bold prose-headings:mb-3
                      prose-p:mb-3 last:prose-p:mb-0
                      prose-a:text-primary prose-a:no-underline
                      prose-li:marker:text-primary
                      prose-code:bg-slate-50 prose-code:border prose-code:border-slate-200 prose-code:rounded-md prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:text-slate-800
                      prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800 prose-pre:shadow-none prose-pre:rounded-xl
                    `}>
                      {(() => {
                        const content = msg.content;
                        const memoryCardRegex = /<MemoryCard([^>]*)>([\s\S]*?)<\/MemoryCard>/gi;
                        const parts = [];
                        let lastIndex = 0;
                        let match;

                        while ((match = memoryCardRegex.exec(content)) !== null) {
                          if (match.index > lastIndex) {
                            parts.push({
                              type: 'markdown',
                              text: content.substring(lastIndex, match.index)
                            });
                          }

                          const attributes = match[1];
                          const innerContent = match[2];
                          const colorMatch = attributes.match(/color="([^"]+)"/);
                          const color = colorMatch ? colorMatch[1] : undefined;

                          parts.push({
                            type: 'memorycard',
                            content: innerContent,
                            color: color
                          });

                          lastIndex = match.index + match[0].length;
                        }

                        if (lastIndex < content.length) {
                          parts.push({
                            type: 'markdown',
                            text: content.substring(lastIndex)
                          });
                        }

                        if (parts.length === 0) {
                          return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
                        }

                        return (
                          <>
                            {parts.map((part, i) => {
                              if (part.type === 'markdown') {
                                return <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>;
                              } else {
                                return <MemoryCard key={i} content={part.content as string} color={part.color} />;
                              }
                            })}
                          </>
                        );
                      })()}
                    </div>

                    {/* Citations block (Filtered to PYQs only) */}
                    {msg.role === 'assistant' && msg.citations && msg.citations.some(cite => cite.source?.toLowerCase().includes('pyq') || cite.file_name?.toLowerCase().includes('pyq')) && (
                      <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50/50 -mx-4 -mb-4 px-4 pb-4 lg:-mx-5 lg:-mb-5 lg:px-5 lg:pb-5 rounded-b-[16px]">
                        <div className="flex items-center gap-1.5 mb-2.5 pt-1">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">Previous Year Questions</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations
                            .filter(cite => cite.source?.toLowerCase().includes('pyq') || cite.file_name?.toLowerCase().includes('pyq'))
                            .map((cite, i) => (
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
                              className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors cursor-pointer group/cite min-h-[44px]"
                            >
                              <div className="bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center text-[11px] font-mono shrink-0 group-hover/cite:bg-primary/10 group-hover/cite:text-primary transition-colors">
                                {i + 1}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-medium text-slate-700 leading-tight truncate max-w-[200px] sm:max-w-none">{cite.source}</span>
                                <span className="text-[11px] text-slate-500 leading-tight">{cite.file_name.replace('.pdf', '')}</span>
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
                <div className="bg-white border border-slate-200 rounded-[16px] rounded-tl-[4px] p-4 shadow-sm flex items-center gap-1.5 h-[52px]">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 lg:p-6 lg:pb-8 z-40 pb-[env(safe-area-inset-bottom,1rem)]">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={handleSubmit}
              className="relative bg-white border border-slate-200 rounded-2xl p-2 lg:p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] focus-within:border-[#0D9488] focus-within:ring-2 focus-within:ring-teal-500/10 transition-all duration-200 min-h-[56px] flex items-end"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a medical question..."
                className="w-full max-h-[200px] min-h-[40px] bg-transparent border-none outline-none resize-none py-2 px-2 lg:px-3 text-[16px] leading-[1.5] text-slate-900 placeholder:text-slate-400 font-sans pr-[56px]"
                rows={1}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 w-[44px] h-[44px] rounded-xl bg-[#0D9488] text-white flex items-center justify-center hover:bg-[#0F766E] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            </form>
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
      <div className="h-screen w-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
