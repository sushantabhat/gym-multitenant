"use client";

import { useState, useEffect } from "react";

export default function RegisterUser() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    tenantId: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchGyms = async () => {
      try {
        const response = await fetch("http://localhost:3001/api/gyms");
        const data = await response.json();
        setGyms(data);
      } catch (err) {
        console.error("Failed to load gyms", err);
      }
    };
    fetchGyms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.name || !formData.email || !formData.tenantId) {
      setError("Name, Email, and Tenant selection are required!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to register user");

      setSuccess(true);
      setFormData({ name: "", email: "", phone_number: "", tenantId: "" });
    } catch (err) {
      setError("Something went wrong connecting to the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 pt-16">
      
      <div className="mb-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Add User
        </h1>
        <p className="text-slate-500">Provision a new user and assign them to a tenant.</p>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-8 w-full max-w-md">
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Assign to Tenant</label>
            <select
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
            >
              <option value="">-- Select a Tenant --</option>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>{gym.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Phone (Optional)</label>
            <input
              type="text"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="+1-555-0198"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
          {success && <p className="text-green-600 text-sm font-medium">Successfully provisioned user!</p>}

          <button
            type="submit"
            disabled={isLoading || gyms.length === 0}
            className="w-full py-2.5 px-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? "Provisioning..." : "Add User"}
          </button>
        </form>
      </div>
    </main>
  );
}
