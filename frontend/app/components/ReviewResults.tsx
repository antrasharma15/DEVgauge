"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Loader2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  X, 
  Activity, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';

interface Finding {
  id: number;
  severity: 'error' | 'warning' | 'info';
  issue: string;
  explanation: string;
  file_name: string;
  line_number: number;
}

interface Review {
  id: number;
  project_id: number;
  review_type: string;
  overall_score: number;
  summary: string;
  created_at: string;
  findings: Finding[];
}

interface ReviewResultsProps {
  reviewId: number;
  onClose?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ReviewResults({ reviewId, onClose }: ReviewResultsProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  useEffect(() => {
    const fetchReviewDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('devgauge_token');
        const response = await axios.get(
          `${API_URL}/api/reviews/${reviewId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setReview(response.data);
      } catch (err: any) {
        console.error("Error fetching review findings:", err);
        const errMsg = err.response?.data?.message || 'Failed to fetch static analysis findings.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchReviewDetails();
    }
  }, [reviewId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-400">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
        <p className="text-sm font-medium animate-pulse">Running analysis engine, parsing findings...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 border border-red-500/20 bg-red-950/10 rounded-2xl text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-zinc-200">Failed to load analysis</h3>
          <p className="text-xs text-zinc-500 max-w-sm">{error || 'Review object not found.'}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  // Count findings by severity
  const errorCount = review.findings.filter(f => f.severity === 'error').length;
  const warningCount = review.findings.filter(f => f.severity === 'warning').length;
  const infoCount = review.findings.filter(f => f.severity === 'info').length;

  // Filtered findings list
  const filteredFindings = review.findings.filter(f => {
    if (activeTab === 'all') return true;
    return f.severity === activeTab;
  });

  // Calculate score colors/grades
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-teal-500 shadow-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 70) return 'from-violet-500 to-indigo-500 shadow-violet-500/10 text-violet-400 border-violet-500/20';
    if (score >= 50) return 'from-amber-500 to-orange-500 shadow-amber-500/10 text-amber-400 border-amber-500/20';
    return 'from-red-500 to-rose-500 shadow-red-500/10 text-red-400 border-red-500/20';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Action Required';
  };

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-200">
      
      {/* Header and Back Button */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4.5">
        <div className="flex items-center gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer"
              title="Back"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" />
              Review Findings
            </h2>
            <p className="text-xs text-zinc-500">Static linter output metrics for project review #{review.id}</p>
          </div>
        </div>
      </div>

      {/* Overview Cards Block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Overall Score Circle Card */}
        <div className="col-span-1 md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 flex items-center gap-5 relative overflow-hidden">
          {/* Subtle gradient behind */}
          <div className={`absolute -right-16 -top-16 w-36 h-36 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${getScoreColor(review.overall_score)}`} />
          
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-950/80 shrink-0">
            {/* Progress glow border */}
            <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-inherit border-r-inherit ${getScoreColor(review.overall_score)}`} />
            <span className="text-2xl font-black tracking-tight">{review.overall_score}</span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Overall Code Quality</span>
            <h3 className="text-base font-bold text-zinc-100 leading-tight">{getScoreGrade(review.overall_score)}</h3>
            <p className="text-[11px] text-zinc-400 truncate max-w-full">{review.summary}</p>
          </div>
        </div>

        {/* Severity Count Metrics */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3">
          
          {/* Errors Count */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-red-500" /> Errors
            </span>
            <span className="text-2xl font-black text-red-400 mt-2">{errorCount}</span>
          </div>

          {/* Warnings Count */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Warnings
            </span>
            <span className="text-2xl font-black text-amber-400 mt-2">{warningCount}</span>
          </div>

          {/* Info Count */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4.5 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-violet-500" /> Info
            </span>
            <span className="text-2xl font-black text-violet-400 mt-2">{infoCount}</span>
          </div>

        </div>
      </div>

      {/* Tabs list for filtering findings */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-0.5">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
              activeTab === 'all' 
                ? 'border-violet-500 text-violet-400 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All Findings ({review.findings.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('error')}
            className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
              activeTab === 'error' 
                ? 'border-red-500 text-red-400 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Errors ({errorCount})
          </button>

          <button 
            onClick={() => setActiveTab('warning')}
            className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
              activeTab === 'warning' 
                ? 'border-amber-500 text-amber-400 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Warnings ({warningCount})
          </button>

          <button 
            onClick={() => setActiveTab('info')}
            className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
              activeTab === 'info' 
                ? 'border-violet-500 text-violet-400 font-bold' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Conventions ({infoCount})
          </button>
        </div>

        {/* Findings Table List */}
        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-zinc-800 bg-zinc-950/20 rounded-2xl gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5.5 h-5.5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-zinc-300">Clean code output</span>
              <span className="text-[11px] text-zinc-600">No issues found matching this linter filter.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-bold text-zinc-400">
                  <th className="py-3 px-4 w-20 text-center">Line</th>
                  <th className="py-3 px-4 w-24">Severity</th>
                  <th className="py-3 px-4 w-40">Issue / Rule</th>
                  <th className="py-3 px-4">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {filteredFindings.map((finding) => (
                  <tr 
                    key={finding.id}
                    className="hover:bg-zinc-900/40 transition-colors duration-150"
                  >
                    <td className="py-3.5 px-4 font-mono text-center text-zinc-500 font-semibold">{finding.line_number}</td>
                    <td className="py-3.5 px-4">
                      {finding.severity === 'error' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400">
                          <AlertOctagon className="w-2.5 h-2.5" /> error
                        </span>
                      )}
                      {finding.severity === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <AlertTriangle className="w-2.5 h-2.5" /> warning
                        </span>
                      )}
                      {finding.severity === 'info' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                          <Info className="w-2.5 h-2.5" /> info
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[11px] text-zinc-300 truncate max-w-[160px]">{finding.issue}</td>
                    <td className="py-3.5 px-4 text-zinc-400 font-medium leading-relaxed">{finding.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
