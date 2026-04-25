'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ShieldCheck, 
  AlertCircle, 
  List, 
  CloudUpload, 
  Microscope,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Citation {
  source: string;
  page: string;
  file_name: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  isSufficient?: boolean;
  confidence?: number;
}

export default function ResearchAssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Welcome to AcaDoc AI Research Assistant. Upload a medical document to begin specialized analysis.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedDocType, setSelectedDocType] = useState('textbook');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus('idle');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', selectedDocType);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setUploadStatus('success');
      setMessages(prev => [...prev, { 
        role: 'system', 
        content: `Successfully indexed ${data.chunks_added} chunks from ${file.name}.` 
      }]);
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

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

      if (!response.ok) throw new Error('Query failed');

      const data = await response.json();
      
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        isSufficient: data.is_sufficient,
        confidence: data.confidence,
      }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: 'Sorry, I encountered an error during analysis.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Microscope className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Research Module</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Research Assistant</h1>
          <p className="text-slate-500 mt-2 font-medium">Upload and analyze medical documents with high-precision grounding.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Upload Document</h3>
            
            <div 
              className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-6 transition-all text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".pdf,.txt,.md"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                ) : (
                  <CloudUpload className={`w-8 h-8 ${dragActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} />
                )}
                <p className="text-xs font-bold text-slate-700">
                  {isUploading ? 'Processing...' : 'Drop PDF or Click'}
                </p>
                <p className="text-[10px] text-slate-400">PDF, MD, or TXT</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Type</label>
              <select 
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="textbook">Medical Textbook</option>
                <option value="research">Research Paper</option>
                <option value="clinical">Clinical Notes</option>
              </select>
            </div>

            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold">Document Indexed Successfully</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[90%] md:max-w-[80%] space-y-2`}>
                  <div className={`p-4 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-200' 
                      : m.role === 'system'
                        ? 'bg-slate-100 text-slate-500 text-[11px] font-medium italic border border-slate-200'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                      {m.content}
                    </div>
                  </div>

                  {m.role === 'assistant' && (
                    <div className="space-y-2">
                      {m.confidence !== undefined && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.isSufficient 
                            ? 'text-green-600 bg-green-50' 
                            : 'text-amber-600 bg-amber-50'
                        }`}>
                          {m.isSufficient ? <ShieldCheck className="w-3" /> : <AlertCircle className="w-3" />}
                          {m.isSufficient ? `Grounded (${Math.round(m.confidence * 100)}%)` : 'Fallback Applied'}
                        </div>
                      )}

                      {m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.citations.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded text-[9px] font-bold border border-slate-100">
                              <FileText className="w-2.5 h-2.5" />
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

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Query your research documents..."
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
              />
              <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
