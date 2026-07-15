"use client";

import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface Finding {
  id: number;
  severity: 'error' | 'warning' | 'info';
  issue: string;
  explanation: string;
  suggested_fix?: string | null;
  file_name: string;
  line_number: number;
}

interface FindingsTableProps {
  findings: Finding[];
}

export default function FindingsTable({ findings }: FindingsTableProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // 1. Sort by severity by default (errors first, then warnings, then info)
  const getSeverityPriority = (severity: string) => {
    switch (severity) {
      case 'error': return 1;
      case 'warning': return 2;
      case 'info': return 3;
      default: return 4;
    }
  };

  const sortedFindings = [...findings].sort((a, b) => {
    const priorityA = getSeverityPriority(a.severity);
    const priorityB = getSeverityPriority(b.severity);
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    // Secondary sort by line number
    return a.line_number - b.line_number;
  });

  // 2. Count severity metrics
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  // 3. Filter findings based on active tab
  const filteredFindings = sortedFindings.filter(f => {
    if (activeTab === 'all') return true;
    return f.severity === activeTab;
  });

  // Toggle row expansion
  const toggleRow = (id: number) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(id);
    }
  };

  // Render empty state if findings list is empty
  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 bg-zinc-950/20 rounded-2xl gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-zinc-200">No issues found — clean code!</span>
          <span className="text-xs text-zinc-500">This source file meets all configured static analysis conventions.</span>
        </div>
      </div>
    );
  }

  // Helper text for empty filter tabs
  const getEmptyFilterMessage = (tab: string) => {
    switch (tab) {
      case 'error': return 'No errors found.';
      case 'warning': return 'No warnings found.';
      case 'info': return 'No conventions found.';
      default: return 'No findings match this filter.';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtering Tabs bar */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-0.5">
        <button
          onClick={() => { setActiveTab('all'); setExpandedRowId(null); }}
          className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
            activeTab === 'all'
              ? 'border-violet-500 text-violet-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          All ({findings.length})
        </button>

        <button
          onClick={() => { setActiveTab('error'); setExpandedRowId(null); }}
          className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
            activeTab === 'error'
              ? 'border-red-500 text-red-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Errors ({errorCount})
        </button>

        <button
          onClick={() => { setActiveTab('warning'); setExpandedRowId(null); }}
          className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
            activeTab === 'warning'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Warnings ({warningCount})
        </button>

        <button
          onClick={() => { setActiveTab('info'); setExpandedRowId(null); }}
          className={`px-4 pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer relative -bottom-[2px] ${
            activeTab === 'info'
              ? 'border-violet-500 text-violet-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Info ({infoCount})
        </button>
      </div>

      {/* Findings Table List */}
      {filteredFindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800 bg-zinc-950/20 rounded-2xl gap-2">
          <span className="text-xs font-semibold text-zinc-400">{getEmptyFilterMessage(activeTab)}</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-28">Severity</th>
                <th className="py-3 px-4 w-44">Issue Tag</th>
                <th className="py-3 px-4 w-40">File Name</th>
                <th className="py-3 px-4 w-20 text-center">Line</th>
                <th className="py-3 px-4">Explanation</th>
                <th className="py-3 px-4 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {filteredFindings.map((finding) => {
                const isExpanded = expandedRowId === finding.id;
                return (
                  <React.Fragment key={finding.id}>
                    {/* Primary Finding Row */}
                    <tr
                      onClick={() => toggleRow(finding.id)}
                      className="hover:bg-zinc-900/40 transition-colors duration-150 cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        {finding.severity === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400">
                            <AlertOctagon className="w-2.5 h-2.5" /> error
                          </span>
                        )}
                        {finding.severity === 'warning' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <AlertTriangle className="w-2.5 h-2.5" /> warning
                          </span>
                        )}
                        {finding.severity === 'info' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-400">
                            <Info className="w-2.5 h-2.5" /> info
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-300 truncate max-w-[170px]">
                        {finding.issue}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 truncate max-w-[150px]">
                        {finding.file_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-center text-zinc-500 font-bold">
                        {finding.line_number}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 leading-normal truncate max-w-[280px]">
                        {finding.explanation}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500" />
                        )}
                      </td>
                    </tr>

                    {/* Expandable Detail View Row */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/60">
                        <td colSpan={6} className="p-4 border-t border-zinc-900/60">
                          <div className="flex flex-col gap-3 text-left">
                            <div>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Detailed Insight</span>
                              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{finding.explanation}</p>
                            </div>
                            
                            {finding.suggested_fix && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Suggested Fix</span>
                                <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950 font-mono text-[11px] text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre">
                                  {finding.suggested_fix}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
