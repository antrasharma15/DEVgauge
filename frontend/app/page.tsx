"use client";

import Link from "next/link";
import { useAuth } from "./context/AuthContext";
import { Terminal, Shield, Award, ChevronRight, Activity, Cpu } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden font-sans">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              DEVgauge
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-full text-sm font-medium bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="px-4 py-2 rounded-full text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="px-5 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col justify-center items-center py-20 relative z-10">
        <div className="text-center max-w-3xl flex flex-col items-center gap-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-950/20 text-violet-400 text-xs font-semibold tracking-wide uppercase">
            <Cpu className="w-3.5 h-3.5" />
            Next-Gen AI Review Engine
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight md:leading-[1.1] text-white">
            Automate Your{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Code Reviews
            </span>{" "}
            With AI
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mt-2">
            DEVgauge performs dual-stage static analysis and advanced AI inspection on your JavaScript snippets and source code files. Get instant, line-by-line feedback.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center max-w-md">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 h-12 px-8 rounded-full font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-xl shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Enter Workspace
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 h-12 px-8 rounded-full font-semibold bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-xl shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Start Reviewing Code
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center h-12 px-8 rounded-full font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-32 max-w-5xl">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 backdrop-blur-md hover:border-violet-500/20 hover:bg-zinc-900/10 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2.5">Static Code Analysis</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Detect syntax errors, formatting inconsistencies, unused variables, and style deviations instantly.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 backdrop-blur-md hover:border-fuchsia-500/20 hover:bg-zinc-900/10 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Cpu className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2.5">AI-Powered Insights</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Locate logical bugs, potential security issues, memory leaks, and get refactoring suggestions from LLM models.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 backdrop-blur-md hover:border-cyan-500/20 hover:bg-zinc-900/10 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2.5">Clean Metrics Dashboard</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Track overall quality score, class density, complexity indexes, and review archives in a unified workspace.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 z-10 text-center text-xs text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} DEVgauge AI Code Reviewer. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
