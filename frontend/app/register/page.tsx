"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { Terminal, User, Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const validatePassword = (passStr: string) => {
    const hasLetter = /[a-zA-Z]/.test(passStr);
    const hasNumber = /[0-9]/.test(passStr);
    return passStr.length >= 6 && hasLetter && hasNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // Front-end Validations
    if (!name || !email || !password) {
      setErr("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }

    if (!validatePassword(password)) {
      setErr("Password must be at least 6 characters long and contain both letters and numbers.");
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (!result.success) {
      setErr(result.message || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Decorative Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 hover:opacity-90 transition-opacity relative z-10">
        <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-600/20">
          <Terminal className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          DEVgauge
        </span>
      </Link>

      {/* Glassmorphic Form Card */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/40 border border-zinc-900 backdrop-blur-xl relative z-10 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-zinc-400 text-sm mb-6">Build an account to start auditing your source code.</p>

        {err && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-red-400 text-xs mb-5 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
          {/* Name input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm placeholder-zinc-600 transition-all duration-200 outline-none"
                required
              />
            </div>
          </div>

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm placeholder-zinc-600 transition-all duration-200 outline-none"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                placeholder="At least 6 chars with letters & numbers"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm placeholder-zinc-600 transition-all duration-200 outline-none"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-sm font-semibold shadow-lg shadow-violet-600/10 hover:shadow-violet-600/25 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none transition-all duration-200 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-xs mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 hover:underline transition-colors font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
