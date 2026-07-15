"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Code2, Folder, Type } from 'lucide-react';

interface PasteCodeProps {
  onSuccess?: (project: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PasteCode({ onSuccess }: PasteCodeProps) {
  const [projectName, setProjectName] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!projectName.trim()) {
      setStatus({ type: 'error', message: 'Please enter a project name.' });
      return;
    }

    if (!code.trim()) {
      setStatus({ type: 'error', message: 'Please paste your code snippet.' });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('devgauge_token');
      
      const response = await axios.post(
        `${API_URL}/api/projects`,
        {
          project_name: projectName.trim(),
          code: code,
          language: language
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setLoading(false);
      setStatus({ 
        type: 'success', 
        message: `Project "${response.data.project_name}" created successfully!` 
      });
      
      // Clear inputs
      setProjectName('');
      setCode('');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Failed to submit code snippet. Please try again.';
      setStatus({ type: 'error', message: errMsg });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-zinc-200">
      {/* Alert banner */}
      {status && (
        <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border animate-in fade-in duration-200 ${
          status.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-950/20 border-red-500/20 text-red-400'
        }`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-medium">{status.message}</span>
        </div>
      )}

      {/* Input Group: Project Name & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5" />
            Project Name
          </label>
          <input
            type="text"
            placeholder="e.g. Auth Service"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={loading}
            className="w-full h-11 px-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm placeholder-zinc-600 transition-all duration-200 outline-none disabled:opacity-50"
            required
          />
        </div>

        {/* Language Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            Programming Language
          </label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm transition-all duration-200 outline-none appearance-none disabled:opacity-50"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Code Textarea Editor */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" />
          Paste Code Snippet
        </label>
        <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/60 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/30 transition-all duration-200">
          <textarea
            placeholder="// Paste your source code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            rows={10}
            className="w-full p-4 rounded-xl bg-transparent text-sm font-mono placeholder-zinc-700 outline-none resize-y disabled:opacity-50 min-h-[200px]"
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
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
            Analyzing Snippet...
          </>
        ) : (
          "Submit Code for Review"
        )}
      </button>
    </form>
  );
}
