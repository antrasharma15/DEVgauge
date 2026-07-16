"use client";

import React, { useState } from 'react';
import { 
  FileCode, 
  Cpu, 
  HelpCircle, 
  Copy, 
  Check, 
  BookOpen, 
  ChevronRight,
  Code
} from 'lucide-react';

interface Parameter {
  name: string;
  type: string;
  description: string;
}

interface DocumentationEntry {
  id: number;
  entry_type: 'file' | 'class' | 'function';
  name: string;
  description: string;
  parameters: string | Parameter[] | null;
  returns: string | null;
  docstring: string | null;
}

interface DocumentationDashboardProps {
  entries: DocumentationEntry[];
}

export default function DocumentationDashboard({ entries }: DocumentationDashboardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    // Default to select the file-level overview
    const fileEntry = entries.find(e => e.entry_type === 'file');
    return fileEntry ? fileEntry.id : (entries[0]?.id || null);
  });
  
  const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});

  const selectedEntry = entries.find(e => e.id === selectedId);

  // Parse parameters if stringified
  const getParsedParams = (params: any): Parameter[] => {
    if (!params) return [];
    if (typeof params === 'string') {
      try {
        return JSON.parse(params);
      } catch {
        return [];
      }
    }
    if (Array.isArray(params)) return params;
    return [];
  };

  const handleCopyDocstring = async (id: number, docstring: string) => {
    try {
      await navigator.clipboard.writeText(docstring);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Group entries for the sidebar list
  const fileEntries = entries.filter(e => e.entry_type === 'file');
  const classEntries = entries.filter(e => e.entry_type === 'class');
  
  // Filter standalone functions vs class methods
  // Class methods names are prefixed with "ClassName."
  const functionEntries = entries.filter(e => e.entry_type === 'function' && !e.name.includes('.'));
  const methodEntries = entries.filter(e => e.entry_type === 'function' && e.name.includes('.'));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-zinc-200">
      
      {/* 1. Left Sidebar Navigation Panel (Wiki Outline) */}
      <div className="lg:col-span-4 rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4 flex flex-col gap-5 min-h-[500px]">
        <div className="border-b border-zinc-900 pb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Module Documentation Wiki</span>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[550px] scrollbar-thin pr-1">
          
          {/* File Overview Section */}
          {fileEntries.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider pl-1">Overview</span>
              {fileEntries.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedId === e.id
                      ? 'bg-violet-950/15 border-violet-500/30 text-violet-300'
                      : 'bg-zinc-950/10 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{e.name}</span>
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          )}

          {/* Classes Section */}
          {classEntries.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider pl-1">Classes ({classEntries.length})</span>
              {classEntries.map(e => (
                <div key={e.id} className="flex flex-col gap-1">
                  <button
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      selectedId === e.id
                        ? 'bg-cyan-950/15 border-cyan-500/30 text-cyan-300'
                        : 'bg-zinc-950/10 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Cpu className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{e.name}</span>
                    </span>
                    <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                  </button>
                  
                  {/* Nested Methods under this class */}
                  {methodEntries.filter(m => m.name.startsWith(e.name + '.')).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`w-[90%] self-end flex items-center justify-between text-left px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        selectedId === m.id
                          ? 'bg-cyan-950/20 border-cyan-500/25 text-cyan-200'
                          : 'bg-zinc-950/5 border-zinc-900/60 text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/20'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Code className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.name.slice(e.name.length + 1)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Standalone Functions Section */}
          {functionEntries.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider pl-1">Standalone Functions ({functionEntries.length})</span>
              {functionEntries.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedId === e.id
                      ? 'bg-emerald-950/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-zinc-950/10 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Code className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{e.name}</span>
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* 2. Right Main Wiki Content Display Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {selectedEntry ? (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-6 flex flex-col gap-6 min-h-[500px]">
            
            {/* Wiki Header */}
            <div className="flex justify-between items-start gap-4 border-b border-zinc-900 pb-5">
              <div className="flex flex-col gap-1.5">
                <span className={`self-start text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                  selectedEntry.entry_type === 'file'
                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-400'
                    : selectedEntry.entry_type === 'class'
                    ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                }`}>
                  {selectedEntry.entry_type === 'file' ? 'module overview' : selectedEntry.entry_type}
                </span>
                <h3 className="text-xl font-bold text-white font-mono leading-tight">{selectedEntry.name}</h3>
              </div>
              
              {selectedEntry.docstring && (
                <button
                  onClick={() => handleCopyDocstring(selectedEntry.id, selectedEntry.docstring!)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    copiedStates[selectedEntry.id]
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-350'
                  }`}
                >
                  {copiedStates[selectedEntry.id] ? (
                    <>
                      <Check className="w-3 h-3" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Docstring
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Description / Purpose Section */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Purpose</h4>
              <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                {selectedEntry.description || "No description provided."}
              </p>
            </div>

            {/* Classes/Functions properties, parameters and returns details */}
            {selectedEntry.entry_type === 'class' && selectedEntry.parameters && (
              <div className="flex flex-col gap-3 mt-1">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties & Attributes</h4>
                <div className="overflow-hidden rounded-xl border border-zinc-900/60 bg-zinc-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900/60 bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5 px-3.5 w-1/3">Property</th>
                        <th className="py-2.5 px-3.5 w-1/4">Type</th>
                        <th className="py-2.5 px-3.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/30">
                      {getParsedParams(selectedEntry.parameters).map((prop, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/20">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-300">{prop.name}</td>
                          <td className="py-2.5 px-3.5"><span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-450 font-semibold">{prop.type || 'any'}</span></td>
                          <td className="py-2.5 px-3.5 text-zinc-400 font-medium">{prop.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedEntry.entry_type === 'function' && (
              <>
                {/* Parameters list */}
                <div className="flex flex-col gap-3 mt-1">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Parameters</h4>
                  {getParsedParams(selectedEntry.parameters).length === 0 ? (
                    <p className="text-xs text-zinc-550 italic pl-1">Takes no arguments.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-zinc-900/60 bg-zinc-950/20">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-900/60 bg-zinc-950/40 text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="py-2.5 px-3.5 w-1/3">Parameter</th>
                            <th className="py-2.5 px-3.5 w-1/4">Type</th>
                            <th className="py-2.5 px-3.5">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/30">
                          {getParsedParams(selectedEntry.parameters).map((param, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/20">
                              <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-300">{param.name}</td>
                              <td className="py-2.5 px-3.5"><span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-450 font-semibold">{param.type || 'any'}</span></td>
                              <td className="py-2.5 px-3.5 text-zinc-400 font-medium">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Returns value description */}
                {selectedEntry.returns && (
                  <div className="flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Returns</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-semibold pl-1">
                      {selectedEntry.returns}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Generated Inline Docstring block */}
            {selectedEntry.docstring && (
              <div className="flex flex-col gap-3 mt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-violet-500" /> Generated Inline Docstring Block
                </h4>
                <div className="relative group rounded-xl border border-zinc-900 bg-zinc-950 p-4 overflow-x-auto max-h-[300px] scrollbar-thin">
                  <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed whitespace-pre font-semibold">
                    {selectedEntry.docstring}
                  </pre>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/30 p-6 flex flex-col items-center justify-center text-center py-20 gap-3">
            <HelpCircle className="w-8 h-8 text-zinc-650" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-zinc-300">No Item Selected</span>
              <span className="text-[10px] text-zinc-550">Select a class or function from the sidebar wiki navigation.</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
