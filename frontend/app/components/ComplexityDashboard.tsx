"use client";

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Cpu, 
  TrendingUp, 
  Hash, 
  FileCode, 
  Flame, 
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface FunctionMetric {
  name: string;
  complexity: number;
  lineStart: number;
  lineEnd: number;
}

interface ComplexityMetrics {
  cyclomatic_complexity: number;
  avg_function_complexity: number;
  file_complexity: number;
  num_functions: number;
  num_classes: number;
  lines_of_code: number;
  functions: FunctionMetric[];
}

interface ComplexityDashboardProps {
  metrics: ComplexityMetrics;
}

export default function ComplexityDashboard({ metrics }: ComplexityDashboardProps) {
  const {
    cyclomatic_complexity,
    avg_function_complexity,
    num_functions,
    num_classes,
    lines_of_code,
    functions = []
  } = metrics;

  // Color mappings based on complexity limits
  const getComplexityColor = (comp: number) => {
    if (comp > 10) return '#ef4444'; // Red (High Complexity)
    if (comp > 5) return '#f59e0b';  // Yellow (Moderate Complexity)
    return '#10b981';                // Green (Low Complexity)
  };

  const getComplexityBg = (comp: number) => {
    if (comp > 10) return 'bg-red-500/10 border-red-500/25 text-red-400';
    if (comp > 5) return 'bg-amber-500/10 border-amber-500/25 text-amber-400';
    return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
  };

  const getComplexityRating = (comp: number) => {
    if (comp > 10) return 'High Complexity';
    if (comp > 5) return 'Moderate Complexity';
    return 'Low Complexity';
  };

  // Format data for Recharts BarChart
  const chartData = functions.map(fn => ({
    name: fn.name.length > 15 ? fn.name.substring(0, 12) + '...' : fn.name,
    fullName: fn.name,
    complexity: fn.complexity,
    lineStart: fn.lineStart,
    lineEnd: fn.lineEnd
  }));

  // Detect code smells
  const complexFunctions = functions.filter(fn => fn.complexity > 5);
  const codeSmells = [];
  if (cyclomatic_complexity > 15) {
    codeSmells.push({
      type: 'critical',
      message: `File complexity is extremely high (${cyclomatic_complexity}). Consider breaking the file down.`
    });
  }
  if (complexFunctions.length > 0) {
    codeSmells.push({
      type: 'warning',
      message: `${complexFunctions.length} function(s) have moderate-to-high complexity (>5). Refactoring recommended.`
    });
  }
  if (lines_of_code > 300) {
    codeSmells.push({
      type: 'info',
      message: `Large source file (${lines_of_code} LOC). Keep modules modular for readability.`
    });
  }

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3.5 border border-zinc-800 bg-zinc-950/95 rounded-xl shadow-xl text-left">
          <p className="text-xs font-bold text-zinc-100 truncate max-w-[200px]">{data.fullName}</p>
          <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] font-semibold">
            <p className="flex justify-between gap-5 text-zinc-400">
              Complexity: <span className="font-bold" style={{ color: getComplexityColor(data.complexity) }}>{data.complexity}</span>
            </p>
            <p className="flex justify-between gap-5 text-zinc-500">
              Lines: <span className="text-zinc-400">L{data.lineStart} - L{data.lineEnd}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 text-zinc-200">
      
      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Max File Complexity */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-850 transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">File Complexity</span>
            <Flame className={`w-4 h-4 ${cyclomatic_complexity > 10 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-3xl font-black text-white">{cyclomatic_complexity}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">max</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium mt-1">Maximum path branches</p>
        </div>

        {/* Average Function Complexity */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-850 transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Avg Complexity</span>
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-3xl font-black text-white">{avg_function_complexity.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">/func</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium mt-1">Average branches count</p>
        </div>

        {/* Structural Counts (Functions / Classes) */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-850 transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Functions & Classes</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2.5 mt-4">
            <span className="text-3xl font-black text-white">{num_functions}</span>
            <span className="text-xs text-zinc-500 font-bold">funcs</span>
            <span className="text-lg font-bold text-zinc-600">/</span>
            <span className="text-xl font-bold text-zinc-400">{num_classes}</span>
            <span className="text-[9px] text-zinc-650 font-bold uppercase">classes</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium mt-1">Structural declaration count</p>
        </div>

        {/* Total Lines of Code (LOC) */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-850 transition-all duration-200">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Lines of Code</span>
            <FileCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-3xl font-black text-white">{lines_of_code}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">LOC</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium mt-1">Total physical code lines</p>
        </div>

      </div>

      {/* 2. Charts & Warnings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Recharts Bar Chart (takes 2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-zinc-900 bg-zinc-950/30 flex flex-col gap-4 min-h-[340px] min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-violet-500" /> Function Complexity Metrics Chart
          </h4>
          
          {chartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-600 gap-2">
              <CheckCircle2 className="w-8 h-8 text-zinc-700" />
              <span className="text-xs font-bold">No functions detected in file</span>
            </div>
          ) : (
            <div className="flex-1 w-full h-[260px] text-[10px] min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" tickLine={false} />
                  <YAxis stroke="#6b7280" tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="complexity" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getComplexityColor(entry.complexity)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Side: Code Smells & Alerts List (takes 1 col) */}
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/30 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Code Smells Detected
          </h4>

          {codeSmells.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-zinc-300">Clean Maintainability</span>
                <span className="text-[10px] text-zinc-650">No obvious code smells detected!</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[250px] scrollbar-thin">
              {codeSmells.map((smell, idx) => (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border flex gap-3 text-left transition-all ${
                    smell.type === 'critical' 
                      ? 'bg-red-950/10 border-red-500/15 text-red-300' 
                      : smell.type === 'warning'
                      ? 'bg-amber-950/10 border-amber-500/15 text-amber-300'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {smell.type === 'critical' ? 'Critical' : smell.type === 'warning' ? 'Warning' : 'Info'}
                    </span>
                    <p className="text-[11px] leading-relaxed font-semibold mt-0.5">{smell.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. Detailed Functions List Table */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mt-2">
          <FileCode className="w-4 h-4 text-cyan-500" /> Function Details Breakdown
        </h4>
        
        {functions.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-600 border border-zinc-900 rounded-2xl bg-zinc-950/20">
            No declared functions found in the audited code snippet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/60 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Function / Method Name</th>
                  <th className="py-3 px-4 w-44">Complexity Rating</th>
                  <th className="py-3 px-4 w-32 text-center">Complexity Score</th>
                  <th className="py-3 px-4 w-36 text-center">Line Bounds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40">
                {[...functions].sort((a, b) => b.complexity - a.complexity).map((fn, idx) => (
                  <tr 
                    key={idx}
                    className="hover:bg-zinc-900/30 transition-colors duration-150"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-300 truncate max-w-[280px]">
                      {fn.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getComplexityBg(fn.complexity)}`}>
                        {getComplexityRating(fn.complexity)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-zinc-400">
                      <span style={{ color: getComplexityColor(fn.complexity) }}>{fn.complexity}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-center text-zinc-500 font-semibold">
                      L{fn.lineStart} - L{fn.lineEnd}
                    </td>
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
