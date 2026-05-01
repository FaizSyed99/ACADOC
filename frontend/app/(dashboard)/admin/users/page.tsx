import { UserTable } from "../../../../src/components/admin/UserTable";
import { Users, UserPlus } from "lucide-react";

/**
 * Fetch users from the internal API
 * Note: Uses a relative URL internal to the project
 */
async function getUsers() {
  const url = `${process.env.NEXTAUTH_URL}/api/admin/users`;
  try {
    const res = await fetch(url, {
      cache: 'no-store' // Critical: Prevent stale admin data
    });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Fetch Users Error:", err);
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Active Students</h1>
          <p className="text-slate-500 mt-2 font-medium">Audit and manage verification status for all enrolled practitioners.</p>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200">
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>
      
      <div className="pt-4">
        <UserTable data={users} />
      </div>
    </div>
  );
}
