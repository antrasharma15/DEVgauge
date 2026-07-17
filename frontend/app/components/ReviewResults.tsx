"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, AlertOctagon, ArrowLeft, X } from 'lucide-react';
import ReviewSummaryCard from './ReviewSummaryCard';
import FindingsTable from './FindingsTable';
import ComplexityDashboard from './ComplexityDashboard';
import DocumentationDashboard from './DocumentationDashboard';

interface Finding {
  id: number;
  severity: 'error' | 'warning' | 'info';
  issue: string;
  explanation: string;
  suggested_fix?: string | null;
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
  complexity_metrics?: {
    id: number;
    review_id: number;
    cyclomatic_complexity: number;
    avg_function_complexity: string | number;
    file_complexity: number;
    num_functions: number;
    num_classes: number;
    lines_of_code: number;
  };
  documentation_entries?: {
    id: number;
    review_id: number;
    entry_type: 'file' | 'class' | 'function';
    name: string;
    description: string;
    parameters: string | any[] | null;
    returns: string | null;
    docstring: string | null;
  }[];
}

interface ReviewResultsProps {
  reviewId: number;
  onClose?: () => void;
  hideHeader?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ReviewResults({ reviewId, onClose, hideHeader }: ReviewResultsProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const errMsg = err.response?.data?.message || 'Failed to fetch review findings.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    if (reviewId) {
      fetchReviewDetails();
    }
  }, [reviewId]);

  // Loading skeleton state (Prompt 5)
  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse text-zinc-500">
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-900">
          <div className="h-7 w-48 bg-zinc-900/80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2 h-28 bg-zinc-900/80 rounded-2xl" />
          <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3">
            <div className="h-28 bg-zinc-900/80 rounded-2xl" />
            <div className="h-28 bg-zinc-900/80 rounded-2xl" />
            <div className="h-28 bg-zinc-900/80 rounded-2xl" />
          </div>
        </div>
        <div className="h-8 w-80 bg-zinc-900/80 rounded-lg mt-2" />
        <div className="h-44 bg-zinc-900/80 rounded-xl" />
      </div>
    );
  }

  // Graceful error display card (Edge case protection)
  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 border border-red-500/20 bg-red-950/10 rounded-2xl text-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-zinc-200">Review Unauthorized or Not Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            {error === 'Project not found or authorization denied' 
              ? "Access denied. You do not have permissions to query this code review." 
              : error || 'Review findings record is missing.'}
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-350 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  const isComplexity = review.review_type === 'complexity';
  const isDocs = review.review_type === 'documentation';

  const errorCount = review.findings.filter(f => f.severity === 'error').length;
  const warningCount = review.findings.filter(f => f.severity === 'warning').length;
  const infoCount = review.findings.filter(f => f.severity === 'info').length;

  // Format complexity data if complexity review type
  let complexityMetrics: any = null;
  if (isComplexity) {
    const parsedFunctions = review.findings
      .filter(f => f.issue === 'function-complexity')
      .map(f => {
        const nameMatch = f.explanation.match(/Function '([^']+)'/);
        const compMatch = f.explanation.match(/complexity of (\d+)/);
        const rangeMatch = f.suggested_fix ? f.suggested_fix.match(/Line (\d+) to (\d+)/) : null;
        
        return {
          name: nameMatch ? nameMatch[1] : 'anonymous',
          complexity: compMatch ? parseInt(compMatch[1]) : 1,
          lineStart: rangeMatch ? parseInt(rangeMatch[1]) : f.line_number,
          lineEnd: rangeMatch ? parseInt(rangeMatch[2]) : f.line_number
        };
      });

    complexityMetrics = {
      cyclomatic_complexity: review.complexity_metrics?.cyclomatic_complexity || 1,
      avg_function_complexity: typeof review.complexity_metrics?.avg_function_complexity === 'string'
        ? parseFloat(review.complexity_metrics.avg_function_complexity)
        : review.complexity_metrics?.avg_function_complexity || 1.00,
      file_complexity: review.complexity_metrics?.file_complexity || 1,
      num_functions: review.complexity_metrics?.num_functions || 0,
      num_classes: review.complexity_metrics?.num_classes || 0,
      lines_of_code: review.complexity_metrics?.lines_of_code || 0,
      functions: parsedFunctions
    };
  }

  return (
    <div className="flex flex-col gap-6 text-zinc-200 animate-in fade-in duration-200">
      
      {/* Header Panel */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-850/60">
          <div className="flex items-center gap-3">
            {onClose && (
              <button 
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-all cursor-pointer shrink-0"
                title="Close Review"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                {isComplexity 
                  ? 'Code Complexity Analysis Report' 
                  : isDocs 
                  ? 'Auto-Generated Code Documentation' 
                  : 'Review Audit Findings'}
              </h2>
              <p className="text-xs text-zinc-500">Record ID: #{review.id} • Created: {new Date(review.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {isComplexity ? (
        /* Render complexity metrics dashboard */
        <ComplexityDashboard metrics={complexityMetrics} />
      ) : isDocs ? (
        /* Render documentation entries dashboard */
        <DocumentationDashboard entries={review.documentation_entries || []} />
      ) : (
        <>
          {/* Composed Summary Card (Prompt 3) */}
          <ReviewSummaryCard 
            overallScore={review.overall_score}
            summary={review.summary}
            reviewType={review.review_type}
            errorCount={errorCount}
            warningCount={warningCount}
            infoCount={infoCount}
          />

          {/* Composed Findings Table List (Prompt 4) */}
          <div className="mt-2">
            <FindingsTable findings={review.findings} />
          </div>
        </>
      )}
    </div>
  );
}
