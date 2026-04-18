import { redirect } from "next/navigation";
import { auth } from "../../../src/lib/auth";
import { ShieldCheck, Users, ClipboardList, LogOut } from "lucide-react";
import Link from "next/link";

/**
 * Admin Dashboard Layout
 * Technical Plan v1.2 §4: Validation Layer
 * Implements strict server-side authentication and role-based guard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  
  // Guard clause: Redirect to signin if not an authenticated admin
  if (!session || (session.user as any).role !== 'admin') {
    redirect("/signin");
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 bg-slate-50/50">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Admin Console</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 mt-4">
          {[
            { name: 'Users', icon: Users, href: '/admin/users' },
            { name: 'Moderation', icon: ClipboardList, href: '/admin/reviews' },
          ].map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all font-semibold text-sm group"
            >
              <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
              {session.user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{session.user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-6xl mx-auto p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
