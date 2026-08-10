"use client";

import { useState, useEffect } from "react";
import { User, Activity, CalendarDays, LogOut, BookOpen, Clock, Dumbbell } from "lucide-react";

export default function MemberPortal() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check session on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("member_email");
    if (savedEmail) {
      handleLogin(savedEmail);
    }
  }, []);

  const handleLogin = async (loginEmail: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        localStorage.removeItem("member_email");
        setIsLoading(false);
        return;
      }
      
      setMember(data);
      localStorage.setItem("member_email", data.email);
      
      // Fetch attendance history
      const histRes = await fetch(`http://localhost:3001/api/member/${data.id}/attendance`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData);
      }
      
      // Fetch classes
      const clsRes = await fetch(`http://localhost:3001/api/tenant/${data.tenantId}/classes`);
      if (clsRes.ok) {
        const clsData = await clsRes.json();
        setClasses(clsData);
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookClass = async (classId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/member/classes/${classId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to book class.");
        return;
      }
      alert("Successfully booked your spot!");
      // Refresh classes to update booking count
      const clsRes = await fetch(`http://localhost:3001/api/tenant/${member.tenantId}/classes`);
      if (clsRes.ok) {
        const clsData = await clsRes.json();
        setClasses(clsData);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) handleLogin(email.trim());
  };

  const logout = () => {
    setMember(null);
    setHistory([]);
    setEmail("");
    localStorage.removeItem("member_email");
  };

  // ----------------------------------------------------
  // LOGIN VIEW
  // ----------------------------------------------------
  if (!member) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-md">
            <User className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Member Portal</h1>
          <p className="text-slate-500 mb-8 text-sm">Enter your registered email address to access your gym profile.</p>
          
          <form onSubmit={submitLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
              />
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Access Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DASHBOARD VIEW
  // ----------------------------------------------------
  const brandColor = member.tenant?.brandColor || "#0f172a";
  const activeSub = member.subscriptions?.[0];
  const isExpired = !activeSub || activeSub.status !== "ACTIVE";
  const plan = activeSub?.plan;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* BRANDED SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg shadow-sm flex items-center justify-center text-white font-bold" style={{ backgroundColor: brandColor }}>
            {member.tenant?.name.charAt(0)}
          </div>
          <h2 className="font-bold text-slate-900 truncate">{member.tenant?.name}</h2>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "overview" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
            style={activeTab === "overview" ? { backgroundColor: brandColor } : {}}
          >
            <User className="w-4 h-4" /> Subscription Profile
          </button>
          
          <button
            onClick={() => setActiveTab("classes")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "classes" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
            style={activeTab === "classes" ? { backgroundColor: brandColor } : {}}
          >
            <Dumbbell className="w-4 h-4" /> Book Classes
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${activeTab === "history" ? "text-white" : "text-slate-600 hover:bg-slate-50"}`}
            style={activeTab === "history" ? { backgroundColor: brandColor } : {}}
          >
            <CalendarDays className="w-4 h-4" /> Check-in History
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
              <p className="text-xs text-slate-500 truncate">{member.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 rounded-md transition-colors hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: brandColor }}>
              {member.tenant?.name.charAt(0)}
            </div>
            <h2 className="font-bold text-slate-900 truncate">{member.tenant?.name}</h2>
          </div>
          <button onClick={logout} className="text-slate-500 p-2"><LogOut className="w-5 h-5"/></button>
        </div>
        
        {/* Mobile Nav (Hidden on Desktop) */}
        <div className="md:hidden flex overflow-x-auto bg-white border-b border-slate-200 hide-scrollbar">
          {["overview", "classes", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 ${activeTab === tab ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500"}`}
              style={activeTab === tab ? { borderColor: brandColor, color: brandColor } : {}}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-8 max-w-5xl mx-auto space-y-8">
          
          <header className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "classes" && "Class Schedule"}
              {activeTab === "history" && "Attendance Log"}
            </h1>
            <p className="text-slate-500 mt-1">
              {activeTab === "overview" && `Welcome back, ${member.name.split(' ')[0]}!`}
              {activeTab === "classes" && "Book your spot in upcoming sessions."}
              {activeTab === "history" && "A complete record of your gym visits."}
            </p>
          </header>

          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Subscription Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-fit">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <User className="w-4 h-4" /> Subscription Profile
                </h3>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${isExpired ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {activeSub?.status || "NO PLAN"}
                      </div>
                    </div>
                    {activeSub && (
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Time Remaining</p>
                        <p className="text-lg font-black text-slate-800">{Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Current Plan</p>
                    <p className="text-xl font-bold text-slate-800">{plan?.name || "None"}</p>
                    
                    {plan?.access && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Access Level</p>
                        <p className="text-sm font-bold text-slate-700">{plan.access}</p>
                      </div>
                    )}
                  </div>

                  {plan?.benefits && plan.benefits.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">Included Benefits</p>
                      <ul className="text-sm text-slate-600 space-y-2">
                        {plan.benefits.map((b: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column in Overview */}
              <div className="flex flex-col gap-8">
                {/* Notice Board */}
                {member.tenant?.welcomeMessage && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: brandColor }}></div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notice Board</h3>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">"{member.tenant.welcomeMessage}"</p>
                  </div>
                )}
                
                {/* Quick Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                   <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Visits</h3>
                     <p className="text-3xl font-black text-slate-800">{history.length}</p>
                   </div>
                   <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                     <Activity className="w-6 h-6 text-slate-400" />
                   </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: CLASSES */}
          {activeTab === "classes" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-0">
                {classes.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Dumbbell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p>No upcoming classes right now.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {classes.map((c: any) => {
                      const dt = new Date(c.startTime);
                      const isFull = c.bookedCount >= c.capacity;
                      const isBooked = c.bookings?.some((b: any) => b.userId === member.id);
                      return (
                        <li key={c.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-100 items-center justify-center shrink-0">
                              <Dumbbell className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-lg mb-1">{c.name}</p>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-2">
                                <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {c.instructor}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {c.duration} mins</span>
                              </div>
                              <p className="text-sm font-medium text-slate-800 bg-slate-100 inline-block px-2 py-1 rounded">
                                {dt.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} @ {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md ${isFull ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                              {c.bookedCount} / {c.capacity} Booked
                            </span>
                            {isBooked ? (
                              <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                <CheckCircle className="w-5 h-5" /> You're Booked
                              </span>
                            ) : (
                              <button
                                disabled={isFull || isExpired}
                                onClick={() => handleBookClass(c.id)}
                                className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-all"
                                style={!isFull && !isExpired ? { backgroundColor: brandColor } : {}}
                              >
                                {isFull ? "Class Full" : "Book Spot"}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-0">
                {history.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p>You haven't checked in yet.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {history.map((record: any) => {
                      const date = new Date(record.checkInTime);
                      return (
                        <li key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100">
                              <CheckCircle className="w-6 h-6" style={{ color: brandColor }} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-lg mb-1">{date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                              <p className="text-sm font-medium text-slate-500">{date.toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md">
                            Checked In
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
