"use client";

import { useState, useEffect } from "react";
import { User, Activity, CalendarDays, LogOut, BookOpen, Clock, Dumbbell } from "lucide-react";

export default function MemberPortal() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Dynamic Header */}
      <div 
        className="h-64 w-full relative flex items-end pb-8 px-8 md:px-12"
        style={{ backgroundColor: brandColor }}
      >
        <div className="absolute top-6 right-6">
          <button 
            onClick={logout}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm backdrop-blur-md"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-md mb-2">
            Welcome back, {member.name.split(' ')[0]}!
          </h1>
          <p className="text-white/80 font-medium text-lg drop-shadow-sm flex items-center gap-2">
            {member.tenant?.name}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
        
        {/* Left Column: Profile & Welcome */}
        <div className="md:col-span-1 flex flex-col gap-8">
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <User className="w-4 h-4" /> Subscription Profile
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${isExpired ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {activeSub?.status || "NO PLAN"}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Current Plan</p>
                <p className="text-lg font-bold text-slate-800">{plan?.name || "None"}</p>
              </div>

              {plan?.access && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Access Level</p>
                  <p className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{plan.access}</p>
                </div>
              )}

              {activeSub && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Expires On</p>
                  <p className="text-slate-700 font-medium">{new Date(activeSub.endDate).toLocaleDateString()}</p>
                </div>
              )}

              {plan?.benefits && plan.benefits.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Plan Benefits</p>
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

          {/* Welcome Message Card */}
          {member.tenant?.welcomeMessage && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: brandColor }}></div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Notice Board</h3>
              <p className="text-slate-700 italic">"{member.tenant.welcomeMessage}"</p>
            </div>
          )}
        </div>

        {/* Right Column: Attendance Log */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" style={{ color: brandColor }} /> 
                Your Check-in History
              </h3>
            </div>
            
            <div className="p-0">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p>You haven't checked in yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {history.map((record: any) => {
                    const date = new Date(record.checkInTime);
                    return (
                      <li key={record.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100">
                            <CheckCircle className="w-5 h-5" style={{ color: brandColor }} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            <p className="text-sm text-slate-500">{date.toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                          Checked In
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          
          {/* Classes Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Dumbbell className="w-5 h-5" style={{ color: brandColor }} /> 
                Upcoming Classes
              </h3>
            </div>
            <div className="p-0">
              {classes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>No upcoming classes right now.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {classes.map((c: any) => {
                    const dt = new Date(c.startTime);
                    const isFull = c.bookedCount >= c.capacity;
                    const isBooked = c.bookings?.some((b: any) => b.userId === member.id);
                    return (
                      <li key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900 text-lg">{c.name}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.instructor}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.duration} mins</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 mt-1">
                            {dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isFull ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {c.bookedCount} / {c.capacity} Booked
                          </span>
                          {isBooked ? (
                            <span className="text-sm font-bold text-slate-400 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> Booked
                            </span>
                          ) : (
                            <button
                              disabled={isFull || isExpired}
                              onClick={() => handleBookClass(c.id)}
                              className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow hover:bg-slate-800 disabled:opacity-50 transition-all"
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
        </div>

      </div>
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
