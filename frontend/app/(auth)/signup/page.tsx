'use client';

import { useState } from "react";
import { Brain, Lock, Mail, User, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // 1. Register the user
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || "Failed to register.");
      }

      // 2. Instantly sign them in to provide a seamless onboarding flow
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        throw new Error("Account created, but automatic sign-in failed. Please log in.");
      } else {
        router.push("/"); // Redirect to the chat interface
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-slate-200">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-5 shadow-lg shadow-blue-500/30">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join AcaDoc AI</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Your intelligent medical textbook assistant.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 leading-relaxed flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                placeholder="Dr. John Doe"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                placeholder="john@medical.edu"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Create Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {loading ? "Creating Profile..." : (
              <>
                Start Learning
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-600 font-bold hover:text-blue-700 hover:underline underline-offset-4 transition-all">
              Log in securely
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
