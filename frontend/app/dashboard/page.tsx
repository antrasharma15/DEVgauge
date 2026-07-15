"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Terminal, 
  LayoutDashboard, 
  Code2, 
  History, 
  Settings, 
  LogOut, 
  Cpu, 
  Clock, 
  AlertTriangle, 
  FileCode,
  Calendar,
  Code,
  Loader2,
  ChevronRight,
  Play,
  CheckCircle2,
  FolderOpen,
  TrendingUp
} from "lucide-react";
import PasteCode from "../components/PasteCode";
import UploadCode from "../components/UploadCode";
import ReviewResults from "../components/ReviewResults";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Project {
  id: number;
  project_name: string;
  language: string;
  file_path: string;
  created_at: string;
  quality_score: number | null;
  latest_review_id: number | null;
  latest_review_summary: string | null;
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // App state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectCode, setProjectCode] = useState<string>("");
  const [loadingCode, setLoadingCode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  
  // Analysis running states
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [runningAI, setRunningAI] = useState<boolean>(false);
  
  const [fetchingProjects, setFetchingProjects] = useState<boolean>(true);
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'history'>('dashboard');
  
  // Reviews history list for the selected project
  const [projectReviews, setProjectReviews] = useState<any[]>([]);
  const [fetchingReviews, setFetchingReviews] = useState<boolean>(false);

  // Protect Route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch projects list
  const fetchProjects = async () => {
    setFetchingProjects(true);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  // Fetch project code content and reviews list
  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setProjectCode("");
    setLoadingCode(true);
    setActiveReviewId(null);
    setProjectReviews([]);
    setFetchingReviews(true);

    try {
      const token = localStorage.getItem('devgauge_token');
      
      const codePromise = axios.get(`${API_URL}/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const reviewsPromise = axios.get(`${API_URL}/api/projects/${project.id}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const [codeRes, reviewsRes] = await Promise.all([codePromise, reviewsPromise]);
      
      setProjectCode(codeRes.data.code);
      setProjectReviews(reviewsRes.data);
    } catch (err) {
      console.error("Error fetching project details:", err);
    } finally {
      setLoadingCode(false);
      setFetchingReviews(false);
    }
  };

  // Run static linter analysis
  const runStaticAnalysis = async (projectId: number) => {
    setAnalyzing(true);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/analyze`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setActiveReviewId(response.data.id);
      fetchProjects(); // Refresh sidebar scores
      
      const reviewsRes = await axios.get(`${API_URL}/api/projects/${projectId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjectReviews(reviewsRes.data);
    } catch (err: any) {
      console.error("Analysis trigger error:", err);
      alert(err.response?.data?.message || "Linter execution failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Run AI review analysis (Prompt 4)
  const runAIReview = async (projectId: number) => {
    setRunningAI(true);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/ai-review`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setActiveReviewId(response.data.id);
      fetchProjects();
      
      const reviewsRes = await axios.get(`${API_URL}/api/projects/${projectId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProjectReviews(reviewsRes.data);
    } catch (err: any) {
      console.error("AI Review trigger error:", err);
      alert(err.response?.data?.message || "AI review execution failed.");
    } finally {
      setRunningAI(false);
    }
  };

  // Format the small badge summarizing the latest review (Prompt 2)
  const renderLatestReviewBadge = (summary: string | null) => {
    if (!summary) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 shrink-0">
          Not analyzed yet
        </span>
      );
    }

    const cleanSummary = summary.toLowerCase();
    
    // Check if clean code (0 errors, 0 warnings, or clean text)
    if (cleanSummary.includes("0 errors, 0 warnings") || cleanSummary.includes("no issues found")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-900/20 shrink-0">
          No issues
        </span>
      );
    }

    // Extract counts if present
    const errMatch = summary.match(/(\d+)\s+errors?/i);
    const warnMatch = summary.match(/(\d+)\s+warnings?/i);
    const errors = errMatch ? parseInt(errMatch[1]) : 0;
    const warnings = warnMatch ? parseInt(warnMatch[1]) : 0;

    if (errors > 0 || warnings > 0) {
      const parts = [];
      if (errors > 0) parts.push(`${errors} errors`);
      if (warnings > 0) parts.push(`${warnings} warnings`);
      
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/25 text-amber-400 border border-amber-900/20 shrink-0">
          {parts.join(", ")}
        </span>
      );
    }

    // Fallback display
    return (
      <span className="px-2.5 py-0.5 rounded text-[10px] bg-violet-950/20 text-violet-400 border border-violet-900/20 shrink-0 truncate max-w-[120px]">
        {summary}
      </span>
    );
  };

  // Handle clicking a project in the list (Prompt 2)
  const handleProjectClick = (p: Project) => {
    if (p.latest_review_id) {
      // Navigates directly to /reviews/:id
      router.push(`/reviews/${p.latest_review_id}`);
    } else {
      // Load details into workspace to analyze
      handleSelectProject(p);
    }
  };

  const totalAudits = projects.length;
  const auditedCount = projects.filter(p => p.quality_score !== null).length;
  const averageScore = auditedCount > 0 
    ? Math.round(projects.reduce((acc, p) => acc + (p.quality_score || 0), 0) / auditedCount)
    : 0;
  const lowScoreCount = projects.filter(p => p.quality_score !== null && p.quality_score < 70).length;

  const metrics = [
    { label: "Average Quality Score", value: auditedCount > 0 ? `${averageScore}/100` : "--", icon: TrendingUp, color: "text-emerald-400" },
    { label: "Low Quality Snips", value: String(lowScoreCount), icon: AlertTriangle, color: "text-amber-400" },
    { label: "Total Code Submits", value: String(totalAudits), icon: Cpu, color: "text-violet-400" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none" />

      {/* Left Sidebar */}
      <aside className="w-66 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex flex-col relative z-25">
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
          <button 
            onClick={() => { setDashboardTab('dashboard'); setSelectedProject(null); setActiveReviewId(null); }}
            className={`flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left w-full ${
              dashboardTab === 'dashboard' && !selectedProject && !activeReviewId
                ? "bg-zinc-900 border border-zinc-800 text-white shadow-lg shadow-black/20"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5 text-violet-400" />
            Dashboard
          </button>
          
          <button 
            onClick={() => { setDashboardTab('history'); }}
            className={`flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left w-full ${
              dashboardTab === 'history'
                ? "bg-zinc-900 border border-zinc-800 text-white shadow-lg shadow-black/20"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
            }`}
          >
            <History className="w-4.5 h-4.5 text-cyan-400" />
            Review History
          </button>
          
          <a href="#" className="flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-all duration-150">
            <Settings className="w-4.5 h-4.5" />
            Settings
          </a>
        </nav>

        {/* User profile section at the bottom */}
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-zinc-850 border border-zinc-700/80 flex items-center justify-center text-zinc-300 font-bold uppercase shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email || ""}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-zinc-900 text-zinc-400 hover:text-red-400 hover:bg-red-950/10 hover:border-red-900/20 text-xs font-semibold transition-all duration-200 cursor-pointer"
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
            <h1 className="text-base font-bold text-white uppercase tracking-wider">
              {dashboardTab === 'history' ? "Audit History" : selectedProject ? `Project: ${selectedProject.project_name}` : "Workspace Overview"}
            </h1>
            <p className="text-[11px] text-zinc-500">
              {dashboardTab === 'history' ? "Complete logs of historic code audits" : selectedProject ? "Analyze project files or view audit results" : "Quick submit portal and code sandbox"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-violet-500" />
              Linter & Gemini Engines Active
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-8 max-w-6xl w-full mx-auto flex flex-col gap-8">
          
          {/* Dashboard Summary (Only shown on main view) */}
          {dashboardTab === 'dashboard' && !selectedProject && !activeReviewId && (
            <>
              {/* Welcome banner */}
              <div className="p-6 rounded-2xl border border-violet-500/10 bg-violet-950/5 relative overflow-hidden flex justify-between items-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col gap-1.5 relative z-10">
                  <h2 className="text-xl font-bold text-white">Hello, {user?.name || "User"}!</h2>
                  <p className="text-sm text-zinc-400 max-w-xl">
                    Ready to audit some code? Paste a code snippet or upload a file below to instantly trigger our static and AI analysis engines.
                  </p>
                </div>
              </div>

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} className="p-5.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex items-center justify-between group hover:border-zinc-800 transition-all duration-200">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</span>
                        <span className="text-2xl font-extrabold text-white">{m.value}</span>
                      </div>
                      <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* MAIN GRID */}
          {activeReviewId ? (
            /* LINTER RESULTS RENDER OVERLAY */
            <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md">
              <ReviewResults 
                reviewId={activeReviewId} 
                onClose={() => { 
                  setActiveReviewId(null); 
                  fetchProjects(); 
                  if (selectedProject) {
                    handleSelectProject(selectedProject);
                  }
                }} 
              />
            </div>
          ) : selectedProject ? (
            /* SELECTED PROJECT VIEW PANEL */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Panel: Project details and code preview (takes 2 cols) */}
              <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                      <FileCode className="w-5.5 h-5.5 text-violet-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{selectedProject.project_name}</h3>
                      <p className="text-zinc-500 text-[10px] flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5" /> Language: <span className="uppercase text-zinc-300 font-bold">{selectedProject.language}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedProject(null); setProjectCode(""); }}
                    className="px-3 h-8.5 rounded-xl border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer"
                  >
                    Close Project
                  </button>
                </div>

                {/* Code Preview Section */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" /> File Code Preview
                  </span>
                  {loadingCode ? (
                    <div className="h-64 rounded-xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-center text-xs text-zinc-500 gap-2">
                      <Loader2 className="w-4.5 h-4.5 animate-spin" /> Loading source file...
                    </div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-900/80 p-4 font-mono text-[11px] text-zinc-300 leading-relaxed scrollbar-thin">
                      <pre className="whitespace-pre">{projectCode}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Analysis Actions & History (takes 1 col) */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col justify-between gap-6 min-h-[460px]">
                <div className="flex flex-col gap-5.5">
                  <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-3.5 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-500" />
                    Audit Controls
                  </h3>

                  {/* Dynamic Audit Runs History List */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audit History Log</span>
                    {fetchingReviews ? (
                      <div className="py-8 text-center text-xs text-zinc-650 flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> Loading runs...
                      </div>
                    ) : projectReviews.length === 0 ? (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-[10px] text-zinc-500 leading-relaxed">
                        This project has no past review runs. Trigger the linter or AI review engines below.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto scrollbar-thin">
                        {projectReviews.map((rev) => (
                          <div 
                            key={rev.id}
                            onClick={() => setActiveReviewId(rev.id)}
                            className="p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-850 hover:bg-zinc-950/40 flex justify-between items-center transition-all duration-150 cursor-pointer group"
                          >
                            <div className="flex flex-col text-left min-w-0 pr-2">
                              <span className="text-[10px] font-semibold text-zinc-350 group-hover:text-white transition-colors truncate">
                                {new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                              <span className="text-[9px] text-zinc-550 group-hover:text-zinc-400 transition-colors truncate mt-0.5">
                                <span className={`font-bold mr-1 ${rev.review_type === 'ai' ? 'text-pink-400/90' : 'text-cyan-400/90'}`}>
                                  [{rev.review_type === 'ai' ? 'AI' : 'Linter'}]
                                </span>
                                {rev.summary}
                              </span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${
                              rev.overall_score >= 90 
                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/20' 
                                : rev.overall_score >= 70 
                                ? 'bg-violet-950/20 text-violet-400 border-violet-900/20'
                                : 'bg-amber-950/20 text-amber-400 border-amber-900/20'
                            }`}>
                              {rev.overall_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Auditing Triggers */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Linter Trigger Button */}
                  <button
                    onClick={() => runStaticAnalysis(selectedProject.id)}
                    disabled={analyzing || runningAI || loadingCode}
                    className="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-bold shadow-lg shadow-violet-600/15 hover:scale-[1.01] hover:shadow-violet-600/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Running Linter...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-white" />
                        Run Linter Audit
                      </>
                    )}
                  </button>

                  {/* AI Review Trigger Button (Prompt 4) */}
                  <button
                    onClick={() => runAIReview(selectedProject.id)}
                    disabled={analyzing || runningAI || loadingCode}
                    className="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-pink-600/15 hover:scale-[1.01] hover:shadow-pink-600/25 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
                  >
                    {runningAI ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating AI...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 text-white" />
                        Run AI Review
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          ) : dashboardTab === 'history' ? (
            /* COMPREHENSIVE HISTORY LISTING VIEW */
            <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
              <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-4">Audited Project Records</h3>
              {fetchingProjects ? (
                <div className="py-12 flex justify-center text-xs text-zinc-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> Fetching projects...
                </div>
              ) : projects.length === 0 ? (
                <p className="py-10 text-center text-xs text-zinc-655">No project audit records found.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {projects.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => handleProjectClick(p)}
                      className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-950/40 flex justify-between items-center transition-all duration-150 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                          <FileCode className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">{p.project_name}</span>
                          <span className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            <Code className="w-3 h-3 uppercase" /> {p.language} 
                            <span>•</span> 
                            <Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {renderLatestReviewBadge(p.latest_review_summary)}
                        <ChevronRight className="w-4 h-4 text-zinc-650 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* NEW CODE SUBMISSION VIEW CARD (DEFAULT DASHBOARD VIEW) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Submit Code Tabs & Form area (takes 2 cols) */}
              <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
                
                {/* Header Selector Tabs */}
                <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">Review Center</h3>
                    <p className="text-zinc-500 text-[11px]">Upload source code files or paste code snippets below</p>
                  </div>
                  
                  <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-zinc-850 shrink-0">
                    <button
                      onClick={() => setActiveTab('paste')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'paste' 
                          ? 'bg-zinc-900 text-violet-400 shadow-md shadow-black/25' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Paste Snippet
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        activeTab === 'upload' 
                          ? 'bg-zinc-900 text-violet-400 shadow-md shadow-black/25' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      File Upload
                    </button>
                  </div>
                </div>

                {/* Tab Content Components */}
                <div className="mt-2">
                  {activeTab === 'paste' ? (
                    <PasteCode onSuccess={(proj) => handleSelectProject(proj)} />
                  ) : (
                    <UploadCode onSuccess={(proj) => handleSelectProject(proj)} />
                  )}
                </div>

              </div>

              {/* Sidebar Recent Audits History Area (takes 1 col) - Prompt 2 */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
                <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-4 flex items-center justify-between">
                  Recent Audits
                  {projects.length > 0 && (
                    <button 
                      onClick={() => setDashboardTab('history')}
                      className="text-[10px] font-bold text-violet-400 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  )}
                </h3>
                
                {fetchingProjects ? (
                  <div className="py-10 flex justify-center text-xs text-zinc-500 gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> loading...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="py-14 text-center text-xs text-zinc-650 flex flex-col items-center justify-center gap-1.5">
                    <FolderOpen className="w-7 h-7 text-zinc-700" />
                    <span>No submissions yet</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
                    {projects.slice(0, 5).map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => handleProjectClick(p)}
                        className="p-3 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-850 hover:bg-zinc-950/40 flex justify-between items-center transition-all duration-150 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 text-left min-w-0 pr-1">
                          <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-zinc-300 group-hover:text-white transition-colors truncate">{p.project_name}</span>
                            <span className="text-[9px] text-zinc-600 uppercase font-bold">{p.language}</span>
                          </div>
                        </div>
                        {renderLatestReviewBadge(p.latest_review_summary)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
