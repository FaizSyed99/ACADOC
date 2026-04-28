import { Dispatch, SetStateAction } from 'react';
import { Book, CheckCircle, PenTool, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
  subject: string;
  setSubject: Dispatch<SetStateAction<string>>;
  intent: string;
  setIntent: Dispatch<SetStateAction<string>>;
}

export const SUBJECTS = [
  "Community Medicine",
  "ENT",
  "Ophthalmology",
  "Forensic Medicine"
];

export const INTENTS = [
  { id: "Revise", label: "📖 Revise (LAQ)", icon: Book },
  { id: "Test", label: "🧪 Quick Test", icon: CheckCircle },
  { id: "Notes", label: "📝 Make Notes", icon: PenTool },
];

export default function Sidebar({ subject, setSubject, intent, setIntent }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-full flex flex-col p-4 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 shrink-0 hidden md:flex">
      <div className="flex items-center gap-2 mb-8 px-2">
        <LayoutDashboard className="w-5 h-5 text-blue-600" />
        <h2 className="font-bold text-slate-800 tracking-tight">AcaDoc AI</h2>
      </div>

      <div className="space-y-6 flex-1">
        {/* Subject Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Active Subject
          </label>
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer transition-all"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Intent Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Study Mode
          </label>
          <div className="flex flex-col gap-2">
            {INTENTS.map((mode) => {
              const Icon = mode.icon;
              const isActive = intent === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setIntent(mode.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-100' : 'text-slate-400'}`} />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session Badge */}
      <div className="mt-auto p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl">
        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Current Session</p>
        <p className="text-sm font-semibold text-blue-900 leading-tight">{subject}</p>
        <p className="text-xs text-blue-600/80 mt-1">{INTENTS.find(i => i.id === intent)?.label}</p>
      </div>
    </aside>
  );
}
