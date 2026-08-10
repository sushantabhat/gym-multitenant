"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformAdmin() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  
  // Navigation State: "verification" | "features"
  const [activeMenu, setActiveMenu] = useState<"verification" | "features">("verification");

  useEffect(() => {
    const email = localStorage.getItem("platformAdminAuth");
    if (!email) {
      router.push("/platform-admin/login");
    } else {
      setAdminEmail(email);
    }
  }, [router]);

  const fetchGyms = async (email: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/admin/gyms", {
        headers: { "x-admin-email": email }
      });
      const data = await response.json();
      setGyms(data);
    } catch (err) {
      console.error("Failed to load gyms", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminEmail) {
      fetchGyms(adminEmail);
    }
  }, [adminEmail]);

  const handleApprove = async (gymId: string) => {
    if (!adminEmail) return;
    try {
      await fetch(`http://localhost:3001/api/admin/gyms/${gymId}/approve`, {
        method: "PUT",
        headers: { "x-admin-email": adminEmail }
      });
      fetchGyms(adminEmail);
    } catch (err) {
      console.error("Failed to approve gym", err);
    }
  };

  const handleToggleFlag = async (gymId: string, flagKey: string, currentValue: boolean) => {
    if (!adminEmail) return;
    try {
      await fetch(`http://localhost:3001/api/admin/gyms/${gymId}/flags/${flagKey}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": adminEmail 
        },
        body: JSON.stringify({ isEnabled: !currentValue })
      });
      fetchGyms(adminEmail);
    } catch (err) {
      console.error("Failed to toggle feature flag", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("platformAdminAuth");
    router.push("/platform-admin/login");
  };

  if (!adminEmail) return null; // Wait for redirect

  const pendingGyms = gyms.filter(g => g.status === 'PENDING');
  const approvedGyms = gyms.filter(g => g.status === 'APPROVED');

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-slate-50">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">God Mode</h2>
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded border border-rose-200">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">{adminEmail}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveMenu("verification")}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeMenu === "verification" 
                ? "bg-slate-100 text-slate-900" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Pending Verification
            </div>
            {pendingGyms.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                {pendingGyms.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMenu("features")}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeMenu === "features" 
                ? "bg-slate-100 text-slate-900" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              Manage Features
            </div>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-rose-600 rounded-md transition-colors hover:bg-rose-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeMenu === "verification" ? "Pending Approvals" : "Tenant Feature Flags"}
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              {activeMenu === "verification" 
                ? "Review and approve new gym registrations to grant them access." 
                : "Toggle premium features on or off for individual active tenants."}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Tenant Name</th>
                    <th className="px-6 py-3.5 font-semibold">Admin Contact</th>
                    <th className="px-6 py-3.5 font-semibold text-right">
                      {activeMenu === "verification" ? "Action" : "Premium Features"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {activeMenu === "verification" && pendingGyms.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <p className="font-medium text-slate-900">All caught up!</p>
                        <p className="text-sm mt-0.5">No pending gym applications require review.</p>
                      </td>
                    </tr>
                  )}

                  {activeMenu === "features" && approvedGyms.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        <p className="font-medium text-slate-900">No active tenants</p>
                        <p className="text-sm mt-0.5">Approve a gym first to manage their features.</p>
                      </td>
                    </tr>
                  )}

                  {(activeMenu === "verification" ? pendingGyms : approvedGyms).map((gym) => {
                    const getFlag = (key: string) => gym.featureFlags?.find((f: any) => f.key === key)?.isEnabled || false;
                    
                    const flags = [
                      { key: 'export-data', label: 'Export CSV' },
                      { key: 'advanced-analytics', label: 'Analytics Tab' },
                      { key: 'member-management', label: 'Members Tab' },
                      { key: 'attendance-tracking', label: 'Attendance Tab' },
                      { key: 'white-labeling', label: 'Settings Tab' },
                      { key: 'classes-scheduling', label: 'Classes Tab' }
                    ];

                    return (
                      <tr key={gym.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {gym.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {gym.users && gym.users.length > 0 ? gym.users[0].email : "N/A"}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end h-full pt-4">
                          {activeMenu === "verification" ? (
                            <button
                              onClick={() => handleApprove(gym.id)}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-sm transition-all active:scale-95 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              Verify & Approve
                            </button>
                          ) : (
                            <div className="flex items-center gap-5">
                              {flags.map(flag => (
                                <div key={flag.key} className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{flag.label}:</span>
                                  <button
                                    onClick={() => handleToggleFlag(gym.id, flag.key, getFlag(flag.key))}
                                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent focus:outline-none transition-colors duration-200 ease-in-out ${
                                      getFlag(flag.key) ? "bg-emerald-500" : "bg-slate-200"
                                    }`}
                                    role="switch"
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        getFlag(flag.key) ? "translate-x-1.5" : "-translate-x-1.5"
                                      }`}
                                    />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
