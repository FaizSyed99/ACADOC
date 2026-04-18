'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, ShieldCheck, AlertCircle, ChevronDown, List, Brain } from 'lucide-react';

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
        body: JSON.stringify({ question: input }),
      });

if (!response.ok) {
      const errorText = await response.text(); // This gets the Python traceback!
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

  return (
    <main className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">AcaDoc AI</h1>
            <p className="text-xs text-slate-500 font-medium">Textbook Grounded Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verification Active
          </span>
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-6">
            <div className="p-4 bg-blue-50 rounded-full">
              <BookOpen className="w-12 h-12 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Welcome to AcaDoc AI</h2>
              <p className="mt-2 text-slate-600 max-w-md mx-auto">
                Your questions are strictly grounded in medical textbooks. 
                I will only answer if I find verified source material.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg mt-8 text-left">
              {[
                "Mechanism of action of Aspirin?",
                "Types of chronic inflammation?",
                "Pharmacokinetics of Digoxin?",
                "Clinical features of Heart Failure?"
              ].map((query) => (
                <button 
                  key={query}
                  onClick={() => setInput(query)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all text-left shadow-sm"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] space-y-2`}>
              <div className={`p-4 rounded-2xl shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>
              </div>

              {m.role === 'assistant' && (
                <div className="space-y-2">
                  {/* Validation Badge */}
                  {m.confidence !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      m.isSufficient 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-amber-600 bg-amber-50'
                    }`}>
                      {m.isSufficient ? <ShieldCheck className="w-3" /> : <AlertCircle className="w-3" />}
                      {m.isSufficient ? `Grounded (${Math.round(m.confidence * 100)}%)` : 'Incomplete Evidence'}
                    </div>
                  )}

                  {/* Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                      {m.citations.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                          <List className="w-2.5 h-2.5" />
                          {c.file_name} (p.{c.page})
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
          <div className="flex justify-start">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a medical question..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
        <p className="mt-2 text-[10px] text-center text-slate-400">
          AcaDoc AI is for educational purposes only. Always consult source textbooks for clinical decisions.
        </p>
      </div>
    </main>
  );
}
