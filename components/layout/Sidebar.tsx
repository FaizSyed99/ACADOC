import { Dispatch, SetStateAction } from 'react';
import { Book, CheckCircle, PenTool, LayoutDashboard, Settings, Library, Microscope, Eye, Headphones, FileSearch, Users, Ear, Search, LayoutGrid, Brain, PieChart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  subject?: string;
  setSubject?: Dispatch<SetStateAction<string>>;
  intent: string;
  setIntent: Dispatch<SetStateAction<string>>;
}

export const SUBJECTS = [
  "Community Medicine",
  "Forensic Medicine"
];

export const INTENTS = [
  { id: "Revise", label: "Revise", icon: Book },
  { id: "Test", label: "Test", icon: CheckCircle },
  { id: "Notes", label: "Notes", icon: PenTool },
];

export default function Sidebar({ subject, setSubject, intent, setIntent }: SidebarProps) {
  const pathname = usePathname();
  const isSubjectsPage = pathname === '/subjects';
  const isHomePage = pathname === '/';

  return (
    <nav className="fixed left-0 top-0 h-screen w-24 flex flex-col items-center py-6 z-40 bg-slate-950/60 backdrop-blur-[30px] border-r border-white/10 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)] hidden md:flex">
      <div className="mb-8">
        <Link href="/">
          <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(8,154,155,0.25)] transition-transform hover:scale-105 active:scale-95">
            <span className="font-space-grotesk text-primary text-xl font-bold">A</span>
          </div>
        </Link>
      </div>

      <div className="flex flex-col gap-6 flex-1 w-full items-center">
        {/* Explore Section */}
        <div className="flex flex-col gap-2 w-full items-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-50">Explore</span>
          
          <Link href="/subjects" className="w-full px-2">
            <button
              className={`flex flex-col items-center justify-center w-full py-2.5 rounded-xl transition-all duration-300 group relative ${
                isSubjectsPage 
                  ? 'text-primary bg-primary/10 shadow-[inset_0_0_20px_rgba(8,154,155,0.15)] border border-primary/20 border-l-4 border-l-primary' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Library className={`w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110 ${isSubjectsPage ? 'drop-shadow-[0_0_8px_rgba(8,154,155,0.5)]' : ''}`} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Library</span>
            </button>
          </Link>
        </div>

        {/* Modes Section */}
        <div className="flex flex-col gap-2 w-full items-center">
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-50">Modes</span>
          {INTENTS.map((mode) => {
            const Icon = mode.icon;
            const isActive = intent === mode.id && isHomePage;
            return (
              <button
                key={mode.id}
                onClick={() => setIntent(mode.id)}
                className={`flex flex-col items-center justify-center w-full py-2.5 px-2 rounded-xl transition-all duration-300 group relative ${
                  isActive 
                    ? 'text-primary bg-primary/10 shadow-[inset_0_0_20px_rgba(8,154,155,0.15)] border border-primary/20 border-l-4 border-l-primary' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'drop-shadow-[0_0_8px_rgba(8,154,155,0.5)]' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="mt-auto flex flex-col gap-2 py-4 w-full items-center border-t border-white/5">
          <button className="flex flex-col items-center justify-center w-full py-2.5 px-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-300 group">
            <Settings className="w-5 h-5 mb-1 group-hover:rotate-45 transition-transform duration-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest font-space-grotesk">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
