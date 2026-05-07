'use client';

import { signIn } from "next-auth/react";
import { GraduationCap, ShieldCheck, Brain } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#089a9b]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#089a9b]/10 border border-[#089a9b]/20 mb-2 shadow-[0_0_20px_-5px_rgba(8,154,155,0.3)]">
            <GraduationCap className="w-8 h-8 text-[#089a9b]" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white font-manrope">
            AcaDoc <span className="text-[#089a9b] italic">AI</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
            Authorized Intelligence Gateway for 3rd Year MBBS Students.
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-8 shadow-2xl relative overflow-hidden group">
          {/* Subtle hover glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#089a9b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors hover:bg-white/[0.07]">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Grounded in medical textbooks.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 transition-colors hover:bg-white/[0.07]">
                <div className="w-10 h-10 rounded-full bg-[#089a9b]/10 flex items-center justify-center border border-[#089a9b]/20">
                  <Brain className="w-5 h-5 text-[#089a9b]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Adaptive</h3>
                  <p className="text-[10px] text-slate-400">Smart mnemonics & recall.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white text-slate-950 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
          Authorized Medical Access Only
        </p>
      </div>
    </div>
  );
}
