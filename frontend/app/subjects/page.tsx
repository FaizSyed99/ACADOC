'use client';

import Sidebar from '../../components/layout/Sidebar';
import { useState } from 'react';
import Link from 'next/link';
import { Users, Ear, Eye, Search, ArrowRight } from 'lucide-react';

const SUBJECTS = [
  {
    id: "Community Medicine",
    name: "Community Medicine",
    description: "Study of population health, disease prevention, and community healthcare systems.",
    icon: Users,
    image: "/images/subjects/community_medicine.png",
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    id: "Forensic Medicine",
    name: "Forensic Medicine",
    description: "Application of medical knowledge to legal investigations and criminal justice.",
    icon: Search,
    image: "/images/subjects/forensic_medicine.png",
    color: "from-slate-500/20 to-zinc-500/20"
  }
];

export default function SubjectsPage() {
  const [intent, setIntent] = useState('Revise');

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-transparent">
      <Sidebar intent={intent} setIntent={setIntent} />

      <main className="flex flex-col flex-1 relative overflow-hidden md:pl-24">
        {/* Header */}
        <header className="flex items-center justify-between px-8 h-16 bg-slate-950/40 backdrop-blur-[20px] border-b border-white/10 z-50 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary tracking-tighter font-manrope antialiased tracking-wide">Explore Subjects</h1>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 mt-4">
            <header>
              <h2 className="font-h1 text-on-surface mb-1 text-3xl">Medical Curriculum</h2>
              <p className="font-body-lg text-on-surface-variant max-w-2xl text-sm">
                Select a subject to begin your textbook-grounded intelligence session. Access high-yield notes, clinical summaries, and exam-focused insights.
              </p>
            </header>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
              {SUBJECTS.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/?subject=${encodeURIComponent(subject.id)}`}
                  className="group relative h-[240px] rounded-xl overflow-hidden glass-card border border-white/10 glow-hover transition-all duration-500"
                >
                  {/* Background Image temporarily removed */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90 transition-opacity group-hover:opacity-100`} />

                  {/* Content */}
                  <div className="relative h-full p-6 flex flex-col justify-end">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-xl flex items-center justify-center border border-primary/30 group-hover:bg-primary transition-colors duration-300">
                        <subject.icon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <h3 className="font-h2 text-xl group-hover:text-primary transition-colors">{subject.name}</h3>
                    </div>

                    <p className="text-slate-400 text-xs max-w-sm mb-4 line-clamp-2 group-hover:text-slate-200 transition-colors">
                      {subject.description}
                    </p>

                    {/* CTA on Hover */}
                    <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <span>Study {subject.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
