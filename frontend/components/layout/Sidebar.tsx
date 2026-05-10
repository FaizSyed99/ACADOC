import { Dispatch, SetStateAction, useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MessageSquare, X } from 'lucide-react';
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
  intent?: string;
  setIntent?: Dispatch<SetStateAction<string>>;
}

const INTENTS = ["Revise", "Test", "Notes", "Clinical"];

export default function Sidebar({ isOpen, setIsOpen, intent = "Revise", setIntent }: SidebarProps) {
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] lg:w-[280px] bg-surface-DEFAULT border-r border-border-subtle flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:h-screen ${isOpen ? 'translate-x-0 shadow-elevated' : '-translate-x-full'}`}>
        
        {/* Mobile Header (Close button) */}
        <div className="flex items-center justify-end p-2 lg:hidden border-b border-border-subtle shrink-0 min-h-[56px]">
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-11 h-11 flex items-center justify-center text-surface-on-surface-variant hover:text-surface-on-surface hover:bg-slate-50 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          <button 
            onClick={handleNewChat}
            className="w-full bg-primary text-white h-[48px] px-4 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          {/* Learning Intent */}
          {setIntent && (
            <div className="flex flex-col gap-2 shrink-0">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Learning Intent
              </h3>
              <div className="bg-slate-100 rounded-lg p-1 grid grid-cols-4 gap-1">
                {INTENTS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setIntent(item)}
                    className={`py-2.5 text-xs font-medium rounded-md transition-all min-h-[44px] ${
                      intent === item 
                        ? 'bg-white text-primary-dark shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Conversations */}
          <div className="flex flex-col gap-2 mt-2">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
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
                  className="flex flex-col gap-1 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group min-h-[44px]"
                >
                  <span className="text-sm font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
                    {session.summary || "New Conversation"}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
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
        <div className="p-5 border-t border-slate-200 bg-surface-DEFAULT shrink-0">
          <UserNav />
        </div>
      </div>
    </>
  );
}
