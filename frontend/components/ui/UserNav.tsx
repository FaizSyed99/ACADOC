'use client';

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings, CreditCard, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export default function UserNav() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-all border border-white/5 group"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20">
          {session.user.image ? (
            <Image 
              src={session.user.image} 
              alt={session.user.name || "User"} 
              width={32} 
              height={32} 
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-white/5">
            <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{session.user.email}</p>
          </div>
          <div className="p-2">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-primary rounded-lg transition-all group">
              <User className="w-4 h-4 text-slate-500 group-hover:text-primary" />
              Profile
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-primary rounded-lg transition-all group">
              <Settings className="w-4 h-4 text-slate-500 group-hover:text-primary" />
              Settings
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-primary rounded-lg transition-all group">
              <CreditCard className="w-4 h-4 text-slate-500 group-hover:text-primary" />
              Billing
            </button>
          </div>
          <div className="p-2 border-t border-white/5">
            <button 
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-all group"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
