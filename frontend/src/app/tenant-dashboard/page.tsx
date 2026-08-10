"use client";

import { useState, useEffect } from "react";
import { Users, Settings, Activity, UserPlus, CheckCircle, ClipboardCheck, Eye, Edit, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function TenantDashboard() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingMember, setEditingMember] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "settings" | "attendance">("overview");

  // Session persistence on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("tenant_adminEmail");
    const savedGymId = localStorage.getItem("tenant_gymId");
    if (savedEmail && savedGymId) {
      setAdminEmail(savedEmail);
      setSelectedGymId(savedGymId);
      fetchDashboard(savedGymId, savedEmail);
      fetchAnalytics(savedGymId);
    }
  }, []);

  // Fetch approved gyms for login
  useEffect(() => {
    fetch("http://localhost:3001/api/gyms")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGyms(data);
      })
      .catch(console.error);
  }, []);

  const fetchDashboard = async (gymId: string, email: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/tenant/${gymId}/dashboard?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        setIsVerified(true);
      } else {
        localStorage.removeItem("tenant_adminEmail");
        localStorage.removeItem("tenant_gymId");
        setIsVerified(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async (gymId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tenant/${gymId}/analytics`);
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGymId || !adminEmail) return;
    setIsLoading(true);
    setError("");
    
    // Attempt fetch
    try {
      const res = await fetch(`http://localhost:3001/api/tenant/${selectedGymId}/dashboard?email=${encodeURIComponent(adminEmail)}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      setDashboardData(data);
      setIsVerified(true);
      
      // Save session
      localStorage.setItem("tenant_adminEmail", adminEmail);
      localStorage.setItem("tenant_gymId", selectedGymId);

      // Fetch analytics
      fetchAnalytics(selectedGymId);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---
  
  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const url = editingMember 
        ? `http://localhost:3001/api/users/${editingMember.id}/details`
        : `http://localhost:3001/api/tenant/${dashboardData.gym.id}/members`;
        
      const res = await fetch(url, {
        method: editingMember ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone_number: fd.get("phone"),
          membershipTier: fd.get("tier")
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save member");
        return;
      }

      (e.target as HTMLFormElement).reset();
      setEditingMember(null);
      fetchDashboard(dashboardData.gym.id, adminEmail);
      fetchAnalytics(dashboardData.gym.id);
    } catch (err) {
      console.error(err);
      alert("Network error: Could not save member.");
    }
  };

  const handleViewMember = (member: any) => {
    alert(`Member Details:\n\nName: ${member.name}\nEmail: ${member.email}\nPhone: ${member.phone_number || 'N/A'}\nTier: ${member.membershipTier}\nStatus: ${member.subscriptionStatus}\nJoined: ${new Date(member.createdAt).toLocaleDateString()}`);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this member?")) return;
    try {
      await fetch(`http://localhost:3001/api/users/${id}`, { method: "DELETE" });
      fetchDashboard(dashboardData.gym.id, adminEmail);
      fetchAnalytics(dashboardData.gym.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/users/${userId}/checkin`, { method: "POST" });
      if (!res.ok) alert("Cannot check in: Subscription may be expired.");
      fetchAnalytics(dashboardData.gym.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    try {
      await fetch(`http://localhost:3001/api/users/${userId}/membership`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: status })
      });
      fetchDashboard(dashboardData.gym.id, adminEmail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await fetch(`http://localhost:3001/api/tenant/${dashboardData.gym.id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandColor: fd.get("brandColor") })
      });
      fetchDashboard(dashboardData.gym.id, adminEmail);
      alert("Settings saved!");
    } catch (err) {
      console.error(err);
    }
  };

  // --- RENDER ---
  
  if (!dashboardData) {
    return (
      <main className="flex-1 flex justify-center p-8 pt-24 bg-slate-50 min-h-screen">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Gym Admin Login</h2>
          <p className="text-sm text-slate-500 mb-6">Select your gym to access your isolated tenant dashboard.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <select
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900"
            >
              <option value="">-- Select Your Gym --</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@yourgym.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || !selectedGymId || !adminEmail}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md"
            >
              {isLoading ? "Authenticating..." : "Secure Login"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const { gym, members } = dashboardData;
  const brandColor = gym.brandColor || "#0f172a"; // Default slate-900
  
  // FEATURE FLAGS
  const getFlag = (key: string) => gym.featureFlags?.find((f: any) => f.key === key)?.isEnabled || false;
  const isExportEnabled = getFlag('export-data');
  const isAnalyticsEnabled = getFlag('advanced-analytics');
  const isMemberMgmtEnabled = getFlag('member-management');
  const isAttendanceEnabled = getFlag('attendance-tracking');
  const isSettingsEnabled = getFlag('white-labeling');

  const COLORS = [brandColor, '#94a3b8', '#cbd5e1'];

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-slate-50">
      
      {/* BRANDED SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center text-white font-bold" style={{ backgroundColor: brandColor }}>
            {gym.name.charAt(0)}
          </div>
          <h2 className="font-bold text-slate-900 truncate">{gym.name}</h2>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {isAnalyticsEnabled && (
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "overview" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
              style={activeTab === "overview" ? { backgroundColor: brandColor } : {}}
            >
              <Activity className="w-4 h-4" /> Analytics Overview
            </button>
          )}
          {isMemberMgmtEnabled && (
            <button
              onClick={() => setActiveTab("members")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "members" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
              style={activeTab === "members" ? { backgroundColor: brandColor } : {}}
            >
              <Users className="w-4 h-4" /> Member Management
            </button>
          )}
          {isAttendanceEnabled && (
            <button
              onClick={() => setActiveTab("attendance")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "attendance" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
              style={activeTab === "attendance" ? { backgroundColor: brandColor } : {}}
            >
              <ClipboardCheck className="w-4 h-4" /> Attendance Kiosk
            </button>
          )}
          {isSettingsEnabled && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "settings" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
              style={activeTab === "settings" ? { backgroundColor: brandColor } : {}}
            >
              <Settings className="w-4 h-4" /> Gym Settings
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => {
              setDashboardData(null);
              setIsVerified(false);
              localStorage.removeItem("tenant_adminEmail");
              localStorage.removeItem("tenant_gymId");
            }} 
            className="text-sm font-medium text-slate-500 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeTab === "overview" && isAnalyticsEnabled && "Dashboard Overview"}
                {activeTab === "members" && isMemberMgmtEnabled && "Member Management"}
                {activeTab === "attendance" && isAttendanceEnabled && "Attendance Kiosk"}
                {activeTab === "settings" && isSettingsEnabled && "White-Label Settings"}
              </h1>
            </div>
            {isExportEnabled && activeTab === "members" && (
              <button 
                onClick={() => alert("CSV Exported!")}
                className="px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                Export Members CSV
              </button>
            )}
          </header>

          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && isAnalyticsEnabled && analyticsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChart className="w-4 h-4" /> Membership Tiers
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analyticsData.tierDistribution} dataKey="_count.id" nameKey="membershipTier" cx="50%" cy="50%" innerRadius={60} outerRadius={80} label>
                        {analyticsData.tierDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Subscription Health
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.statusDistribution}>
                      <XAxis dataKey="subscriptionStatus" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="_count.id" fill={brandColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm md:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Recent Check-ins
                </h3>
                {analyticsData.recentAttendance.length === 0 ? (
                  <p className="text-sm text-slate-500">No check-ins yet.</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {analyticsData.recentAttendance.map((a: any) => (
                      <div key={a.id} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 flex flex-col">
                        <span>{a.user.name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(a.checkInTime).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: MEMBERS */}
          {activeTab === "members" && isMemberMgmtEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Member</th>
                      <th className="px-4 py-3 font-semibold">Tier</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((member: any) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                            {member.membershipTier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={member.subscriptionStatus}
                            onChange={(e) => handleUpdateStatus(member.id, e.target.value)}
                            className={`text-xs font-bold rounded-full px-2 py-1 outline-none border ${
                              member.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              member.subscriptionStatus === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="FROZEN">FROZEN</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => handleViewMember(member)} className="text-slate-400 hover:text-blue-600 transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingMember(member)} className="text-slate-400 hover:text-amber-600 transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMember(member.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> {editingMember ? "Edit Member" : "Add New Member"}
                  </h3>
                  {editingMember && (
                    <button onClick={() => setEditingMember(null)} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Cancel</button>
                  )}
                </div>
                <form onSubmit={handleAddMember} className="flex flex-col gap-3">
                  <input key={`name-${editingMember?.id}`} name="name" defaultValue={editingMember?.name} required placeholder="Full Name" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input key={`email-${editingMember?.id}`} name="email" type="email" defaultValue={editingMember?.email} required placeholder="Email Address" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <input key={`phone-${editingMember?.id}`} name="phone" defaultValue={editingMember?.phone_number} placeholder="Phone (Optional)" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  <select key={`tier-${editingMember?.id}`} name="tier" defaultValue={editingMember?.membershipTier || "BASIC"} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md text-slate-700 font-medium">
                    <option value="BASIC">Basic Plan</option>
                    <option value="PREMIUM">Premium Plan</option>
                    <option value="VIP">VIP Plan</option>
                  </select>
                  <button type="submit" className="w-full py-2 mt-2 text-white text-sm font-semibold rounded-md shadow-sm" style={{ backgroundColor: brandColor }}>
                    {editingMember ? "Update Member" : "Register Member"}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === "attendance" && isAttendanceEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-800">Scan Member</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {members.map((member: any) => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleCheckIn(member.id)}
                        className="px-4 py-2 text-xs font-bold rounded-md shadow-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: brandColor }}
                        disabled={member.subscriptionStatus !== 'ACTIVE'}
                      >
                        {member.subscriptionStatus === 'ACTIVE' ? "Check-In" : "EXPIRED"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-fit">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-800">Today's Check-ins</h3>
                </div>
                <div className="p-4">
                  {!analyticsData?.recentAttendance || analyticsData.recentAttendance.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No check-ins yet today.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {analyticsData.recentAttendance.map((a: any) => (
                        <div key={a.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                          <span className="font-medium text-slate-800">{a.user.name}</span>
                          <span className="text-xs font-mono text-slate-500">
                            {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && isSettingsEnabled && (
            <div className="max-w-lg bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">White-Label Customization</h3>
              <form onSubmit={handleUpdateSettings} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input name="brandColor" type="color" defaultValue={brandColor} className="w-12 h-12 rounded cursor-pointer" />
                    <span className="text-sm text-slate-500 font-mono uppercase">{brandColor}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">This color will be dynamically applied to your dashboard sidebar, charts, and buttons.</p>
                </div>
                <button type="submit" className="px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-md shadow-sm">
                  Save Changes
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
