import { useState, useEffect } from 'react';
import { History, X, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: string;
  subject: string;
  intent: string;
  summary: string;
  updated_at: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/sessions')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSessions(data);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-24 w-80 bg-slate-950/95 backdrop-blur-xl border-r border-white/10 z-30 shadow-2xl flex flex-col animate-in slide-in-from-left-8 duration-300">
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-white tracking-wide">Chat History</h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce mx-1" />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce mx-1 [animation-delay:0.15s]" />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce mx-1 [animation-delay:0.3s]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-sm">
            No previous sessions found. Start chatting!
          </div>
        ) : (
          sessions.map(session => (
            <Link 
              key={session.id} 
              href={`/?subject=${encodeURIComponent(session.subject)}&session=${session.id}`}
              onClick={onClose}
              className="block p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{session.subject}</span>
                <span className="text-[10px] text-slate-500">{new Date(session.updated_at).toLocaleDateString()}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 mb-2">
                {session.summary || "New Conversation"}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                <MessageSquare className="w-3 h-3" />
                <span>{session.intent}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
