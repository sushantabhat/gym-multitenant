"use client";

import { useState } from "react";

export default function GymApplication() {
  const [formData, setFormData] = useState({
    name: "",
    adminName: "",
    adminEmail: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.name || !formData.adminName || !formData.adminEmail) {
      setError("All fields are required!");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to apply");

      setSuccess(true);
      setFormData({ name: "", adminName: "", adminEmail: "" });
    } catch (err) {
      setError("Something went wrong connecting to the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto p-8 pt-16">
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Apply for AcmeFit</h1>
        <p className="text-slate-500">Submit your gym for verification on our platform.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col gap-6">
        
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Organization Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Iron Paradise Gym"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Admin Name</label>
            <input
              type="text"
              value={formData.adminName}
              onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              placeholder="Your Full Name"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Admin Email</label>
            <input
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@irongym.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium text-center">
              ✅ Application submitted successfully! Please wait for a Platform Admin to verify your gym.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
        >
          {isLoading ? "Submitting Application..." : "Submit Application"}
        </button>
      </form>
      
    </main>
  );
}
