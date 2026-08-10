"use client";

import { useState, useEffect } from "react";

export default function TenantDashboard() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");



  // Fetch all approved gyms to populate the Gym dropdown
  useEffect(() => {
    fetch("http://localhost:3001/api/gyms")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGyms(data);
        } else {
          console.error("Expected array of gyms but got:", data);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGymId || !adminEmail) return;

    setIsLoading(true);
    setError("");
    setDashboardData(null);

    try {
      const response = await fetch(`http://localhost:3001/api/tenant/${selectedGymId}/dashboard?email=${encodeURIComponent(adminEmail)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load dashboard");
      }
      
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isExportEnabled = dashboardData?.gym?.featureFlags?.find((f: any) => f.key === 'export-data')?.isEnabled;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto p-8 pt-12">
      
      {!dashboardData ? (
        <div className="max-w-md mx-auto mt-12 bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Gym Admin Login</h2>
          <p className="text-sm text-slate-500 mb-6">Select your gym to access your isolated tenant dashboard.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Select Gym</label>
              <select
                value={selectedGymId}
                onChange={(e) => setSelectedGymId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
              >
                <option value="">-- Select Your Gym --</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>{gym.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yourgym.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 placeholder-slate-400"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !selectedGymId || !adminEmail}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {isLoading ? "Authenticating..." : "Secure Login"}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{dashboardData.gym.name} Dashboard</h1>
              <p className="text-slate-500 mt-1">Manage your members and gym settings.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button onClick={() => setDashboardData(null)} className="text-sm text-slate-500 hover:text-slate-900">
                Logout
              </button>
              
              {/* FEATURE FLAG: EXPORT DATA (Tenant-Specific) */}
              {isExportEnabled && (
                <button 
                  onClick={() => alert("Export feature activated! This would download a CSV in a real app.")}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
                >
                  Export Member CSV
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800">Registered Members</h3>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {dashboardData.members.length} Total
              </span>
            </div>
            
            {dashboardData.members.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No members registered yet.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.members.map((member: any) => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{member.name}</td>
                      <td className="px-6 py-4 text-slate-500">{member.email}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
