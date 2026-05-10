'use client';

import Sidebar from '../../components/layout/Sidebar';
import { useState } from 'react';
import Link from 'next/link';
import { Users, Search, ArrowRight, Menu } from 'lucide-react';
import UserNav from '../../components/ui/UserNav';

const SUBJECTS = [
  {
    id: "Community Medicine",
    name: "Social and Preventive Medicine",
    description: "Study of population health, disease prevention, and community healthcare systems.",
    icon: Users,
    color: "from-teal-500/10 to-emerald-500/10"
  },
  {
    id: "Forensic Medicine",
    name: "Forensic Medicine and Toxicology",
    description: "Application of medical knowledge to legal investigations and criminal justice.",
    icon: Search,
    color: "from-slate-500/10 to-zinc-500/10"
  }
];

export default function SubjectsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-cream overflow-hidden selection:bg-primary/20 selection:text-primary-dark">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex flex-col flex-1 relative min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-[72px] bg-white/90 backdrop-blur-md border-b border-border-subtle flex items-center px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-surface-on-surface-variant hover:text-surface-on-surface rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="font-serif text-primary font-bold">A</span>
              </div>
              <span className="font-serif font-bold text-surface-on-surface text-lg">AcaDoc AI</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
            <header className="mb-10 text-center">
              <h1 className="font-serif text-3xl lg:text-4xl font-bold text-surface-on-surface mb-3">Medical Curriculum</h1>
              <p className="font-sans text-[15px] leading-relaxed text-surface-on-surface-variant max-w-2xl mx-auto">
                Select a subject to begin your textbook-grounded intelligence session. Access high-yield notes, clinical summaries, and exam-focused insights.
              </p>
            </header>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
              {SUBJECTS.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/?subject=${encodeURIComponent(subject.id)}`}
                  className="group relative h-[240px] rounded-2xl overflow-hidden bg-white border border-border-subtle hover:border-primary transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${subject.color} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />

                  {/* Content */}
                  <div className="relative h-full p-6 flex flex-col">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary transition-colors duration-300 mb-4">
                      <subject.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                    </div>
                    
                    <h3 className="font-serif font-bold text-xl text-surface-on-surface mb-2">{subject.name}</h3>

                    <p className="text-surface-on-surface-variant text-sm max-w-sm mb-4 line-clamp-2">
                      {subject.description}
                    </p>

                    {/* CTA on Hover */}
                    <div className="mt-auto flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
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
