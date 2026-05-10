import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, Menu, X } from 'lucide-react';
import UserNav from '../ui/UserNav';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  subject: string;
  intent: string;
  summary: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleNewChat = () => {
    router.push('/');
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-surface-on-surface/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[320px] bg-surface-DEFAULT border-r border-border-subtle flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:h-screen ${isOpen ? 'translate-x-0 shadow-elevated' : '-translate-x-full'}`}>
        
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <span className="font-serif text-primary font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-surface-on-surface">AcaDoc AI</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-surface-on-surface-variant hover:text-surface-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <button 
            onClick={handleNewChat}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            New Chat
          </button>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wider text-surface-on-surface-variant font-semibold mb-1">
              Recent Conversations
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-surface-on-surface-variant text-center py-4">No history yet.</p>
            ) : (
              sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/?subject=${encodeURIComponent(session.subject)}&session=${session.id}`}
                  onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                  className="flex flex-col gap-1 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-border-subtle group"
                >
                  <span className="text-sm font-medium text-surface-on-surface truncate group-hover:text-primary transition-colors">
                    {session.summary || "New Conversation"}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-surface-on-surface-variant">
                    <MessageSquare className="w-3 h-3" />
                    <span className="truncate">{session.subject}</span>
                    <span>•</span>
                    <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Bottom Profile */}
        <div className="p-6 border-t border-border-subtle bg-surface-DEFAULT">
          <UserNav />
        </div>
      </div>
    </>
  );
}
