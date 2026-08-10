import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AcmeFit Platform",
  description: "A professional gym multitenant platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
        
        <nav className="w-full h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-50">
          <div className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
            Acme<span className="text-blue-600">Fit</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-widest ml-2">Platform</span>
          </div>
          <div className="flex gap-6 items-center">
            <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Apply</a>
            <a href="/platform-admin" className="text-sm font-medium text-rose-600 hover:text-rose-800 transition-colors">Platform Admin</a>
            <div className="h-4 w-px bg-slate-300"></div>
            <a href="/tenant-dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Gym Login</a>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}
