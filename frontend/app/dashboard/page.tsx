"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { 
  Terminal, 
  LayoutDashboard, 
  Code2, 
  History, 
  Settings, 
  LogOut, 
  User, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  FileCode,
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Protect Route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center animate-pulse shadow-lg shadow-violet-600/20">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-medium animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Mock metrics for layout visualization
  const metrics = [
    { label: "Overall Quality Score", value: "88/100", change: "+4.2%", icon: TrendingUp, color: "text-emerald-400" },
    { label: "Critical Issues", value: "3", change: "-2 from last run", icon: AlertTriangle, color: "text-amber-400" },
    { label: "Total Code Audits", value: "24", change: "14 snippets, 10 files", icon: Cpu, color: "text-violet-400" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none" />

      {/* Left Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-25">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-2.5 border-b border-zinc-900">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Terminal className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            DEVgauge
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
          <a href="#" className="flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium bg-zinc-900 border border-zinc-800 text-white shadow-lg shadow-black/20 transition-all duration-200">
            <LayoutDashboard className="w-4.5 h-4.5 text-violet-400" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 hover:border hover:border-zinc-900 transition-all duration-150">
            <Code2 className="w-4.5 h-4.5" />
            Audit Code
          </a>
          <a href="#" className="flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 hover:border hover:border-zinc-900 transition-all duration-150">
            <History className="w-4.5 h-4.5" />
            Review History
          </a>
          <a href="#" className="flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 hover:border hover:border-zinc-900 transition-all duration-150">
            <Settings className="w-4.5 h-4.5" />
            Settings
          </a>
        </nav>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-950/10 hover:border-red-900/20 text-xs font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        {/* Header bar */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h1 className="text-base font-bold text-white uppercase tracking-wider">Dashboard Overview</h1>
            <p className="text-[11px] text-zinc-500">Workspace status and quick actions</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Day 3 Dev Active
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 max-w-6xl w-full mx-auto flex flex-col gap-8">
          
          {/* Welcome banner */}
          <div className="p-6 rounded-2xl border border-violet-500/10 bg-violet-950/5 relative overflow-hidden flex justify-between items-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col gap-1.5 relative z-10">
              <h2 className="text-xl font-bold text-white">Hello, {user.name}!</h2>
              <p className="text-sm text-zinc-400 max-w-xl">
                Ready to review some code? Paste a javascript code snippet or upload files to start our static and AI analysis engines.
              </p>
            </div>
            <button className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-semibold shadow-lg shadow-violet-600/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              New Audit
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {metrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex items-center justify-between group hover:border-zinc-800 transition-all duration-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</span>
                    <span className="text-2xl font-extrabold text-white">{m.value}</span>
                    <span className="text-[10px] text-zinc-400">{m.change}</span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Code Submission Work Area (Placeholder for Day 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Submit New Card (takes 2 cols) */}
            <div className="lg:col-span-2 p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Review Center</h3>
                  <p className="text-zinc-500 text-[11px]">Upload documents or paste blocks of code below</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-medium text-zinc-400">Pasted Snippet</span>
                  <span className="px-2.5 py-1 rounded-md border border-zinc-900 text-[10px] font-medium text-zinc-500">File Upload</span>
                </div>
              </div>

              {/* Editor Workspace Skeleton */}
              <div className="flex-1 h-64 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Code2 className="w-5.5 h-5.5 text-violet-400 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-zinc-300">Editor Workspace Active</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  We are building the Monaco Code Editor sandbox and File Upload storage triggers next (Day 4 task).
                </p>
              </div>
            </div>

            {/* Sidebar info (takes 1 col) */}
            <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
              <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-4">Recent Audits</h3>
              
              {/* Mock items list */}
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-200">auth_helper.js</span>
                      <span className="text-[10px] text-zinc-500">12 lines • JS</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/20 text-emerald-400 border border-emerald-900/30">92/100</span>
                </div>

                <div className="p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-200">regex_validator.js</span>
                      <span className="text-[10px] text-zinc-500">8 lines • JS</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/20 text-emerald-400 border border-emerald-900/30">84/100</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
