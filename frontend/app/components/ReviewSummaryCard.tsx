"use client";

import React from 'react';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';

interface ReviewSummaryCardProps {
  overallScore: number;
  summary: string;
  reviewType: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export default function ReviewSummaryCard({
  overallScore,
  summary,
  reviewType,
  errorCount,
  warningCount,
  infoCount
}: ReviewSummaryCardProps) {
  // Score color thresholds
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500/20 bg-emerald-950/5';
    if (score >= 70) return 'from-violet-500 to-indigo-500 text-violet-400 border-violet-500/20 bg-violet-950/5';
    if (score >= 50) return 'from-amber-500 to-orange-500 text-amber-400 border-amber-500/20 bg-amber-950/5';
    return 'from-red-500 to-rose-500 text-red-400 border-red-500/20 bg-red-950/5';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Action Required';
  };

  const isAI = reviewType === 'ai';

  return (
    <div className="flex flex-col gap-5">
      {/* Dynamic Header Label for Linter vs AI */}
      <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          isAI 
            ? 'bg-pink-500/10 border border-pink-500/25 text-pink-400 shadow-md shadow-pink-500/5' 
            : 'bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-md shadow-cyan-500/5'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {isAI ? 'AI Code Review' : 'Static Linter Audit'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quality Score Circle Card */}
        <div className="col-span-1 md:col-span-2 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 flex items-center gap-5 relative overflow-hidden">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-950/80 shrink-0">
            <span className="text-2xl font-black tracking-tight">{overallScore}</span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Overall Quality Rating</span>
            <h3 className="text-base font-bold text-zinc-100 leading-tight">{getScoreGrade(overallScore)}</h3>
            <p className="text-xs text-zinc-400 truncate max-w-full">{summary}</p>
          </div>
        </div>

        {/* Severity Metrics Counts */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3">
          {/* Errors count */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-red-500" /> Errors
            </span>
            <span className="text-2xl font-black text-red-400 mt-2">{errorCount}</span>
          </div>

          {/* Warnings count */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Warnings
            </span>
            <span className="text-2xl font-black text-amber-400 mt-2">{warningCount}</span>
          </div>

          {/* Info count */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-violet-500" /> Info
            </span>
            <span className="text-2xl font-black text-violet-400 mt-2">{infoCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
