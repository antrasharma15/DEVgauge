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
  TrendingUp,
  Hash,
  BookOpen,
  Trash2,
  FileText,
  RefreshCw
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
  const [runningComplexity, setRunningComplexity] = useState<boolean>(false);
  const [runningDocs, setRunningDocs] = useState<boolean>(false);
  
  const [fetchingProjects, setFetchingProjects] = useState<boolean>(true);
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'history'>('dashboard');
  
  // Search & Sort filters (Day 11)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [projectFetchError, setProjectFetchError] = useState<string | null>(null);
  const [reviewsFetchError, setReviewsFetchError] = useState<string | null>(null);
  const [projectsPage, setProjectsPage] = useState<number>(1);
  const [projectsPagination, setProjectsPagination] = useState<{ total: number, pages: number }>({ total: 0, pages: 1 });
  const [reviewsPage, setReviewsPage] = useState<number>(1);
  const [reviewsPagination, setReviewsPagination] = useState<{ total: number, pages: number }>({ total: 0, pages: 1 });
  
  // Reviews history list for the selected project
  const [projectReviews, setProjectReviews] = useState<any[]>([]);
  const [fetchingReviews, setFetchingReviews] = useState<boolean>(false);

  // Unified Tabs details states (Day 11)
  const [activeDetailTab, setActiveDetailTab] = useState<'static' | 'ai' | 'complexity' | 'documentation' | 'code'>('static');
  const [selectedReviewIds, setSelectedReviewIds] = useState<{
    static: number | null;
    ai: number | null;
    complexity: number | null;
    documentation: number | null;
  }>({ static: null, ai: null, complexity: null, documentation: null });

  // Protect Route
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch projects list (Day 11: search & sort)
  const fetchProjects = async (search = "", sort = "newest", page = 1) => {
    setFetchingProjects(true);
    setProjectFetchError(null);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.get(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { search, sort, page, limit: 20 }
      });
      setProjects(response.data.data);
      setProjectsPagination({
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      });
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjectFetchError("Failed to fetch project listings.");
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    setProjectsPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (user) {
      const delayDebounce = setTimeout(() => {
        fetchProjects(searchQuery, sortBy, projectsPage);
      }, 300); // 300ms debounce

      return () => clearTimeout(delayDebounce);
    }
  }, [user, searchQuery, sortBy, projectsPage]);

  const fetchReviews = async (projectId: number, page = 1) => {
    setFetchingReviews(true);
    setReviewsFetchError(null);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.get(`${API_URL}/api/projects/${projectId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page, limit: 10 }
      });
      setProjectReviews(response.data.data);
      setReviewsPagination({
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      });
      return response.data.data;
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviewsFetchError("Failed to fetch project reviews details.");
    } finally {
      setFetchingReviews(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      fetchReviews(selectedProject.id, reviewsPage);
    }
  }, [reviewsPage, selectedProject]);

  // Fetch project code content and reviews list
  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setProjectCode("");
    setLoadingCode(true);
    setActiveReviewId(null);
    setProjectReviews([]);
    setReviewsPage(1);

    try {
      const token = localStorage.getItem('devgauge_token');
      
      const codeRes = await axios.get(`${API_URL}/api/projects/${project.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setProjectCode(codeRes.data.code);
      const reviews = await fetchReviews(project.id, 1);

      if (reviews && reviews.length > 0) {
        // Find latest reviews for each category
        const staticId = reviews.find((r: any) => r.review_type === 'static' || r.review_type === 'linter')?.id || null;
        const aiId = reviews.find((r: any) => r.review_type === 'ai')?.id || null;
        const complexityId = reviews.find((r: any) => r.review_type === 'complexity')?.id || null;
        const docId = reviews.find((r: any) => r.review_type === 'documentation')?.id || null;

        setSelectedReviewIds({
          static: staticId,
          ai: aiId,
          complexity: complexityId,
          documentation: docId
        });
      }
      setActiveDetailTab('static'); // default to static linter analysis tab
    } catch (err) {
      console.error("Error fetching project details:", err);
    } finally {
      setLoadingCode(false);
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
      
      const newReviewId = response.data.id;
      setSelectedReviewIds(prev => ({ ...prev, static: newReviewId }));
      setActiveDetailTab('static');
      fetchProjects(searchQuery, sortBy, projectsPage); // Refresh sidebar scores
      await fetchReviews(projectId, 1);
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
      
      const newReviewId = response.data.id;
      setSelectedReviewIds(prev => ({ ...prev, ai: newReviewId }));
      setActiveDetailTab('ai');
      fetchProjects(searchQuery, sortBy, projectsPage);
      await fetchReviews(projectId, 1);
    } catch (err: any) {
      console.error("AI Review trigger error:", err);
      alert(err.response?.data?.message || "AI review execution failed.");
    } finally {
      setRunningAI(false);
    }
  };

  // Run Complexity Analysis
  const runComplexityAnalysis = async (projectId: number) => {
    setRunningComplexity(true);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/complexity`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const newReviewId = response.data.review.id;
      setSelectedReviewIds(prev => ({ ...prev, complexity: newReviewId }));
      setActiveDetailTab('complexity');
      fetchProjects(searchQuery, sortBy, projectsPage);
      await fetchReviews(projectId, 1);
    } catch (err: any) {
      console.error("Complexity trigger error:", err);
      alert(err.response?.data?.message || "Complexity analysis execution failed.");
    } finally {
      setRunningComplexity(false);
    }
  };

  // Run Documentation Generation
  const runDocsGeneration = async (projectId: number) => {
    setRunningDocs(true);
    try {
      const token = localStorage.getItem('devgauge_token');
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/documentation`, null, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const newReviewId = response.data.review.id;
      setSelectedReviewIds(prev => ({ ...prev, documentation: newReviewId }));
      setActiveDetailTab('documentation');
      fetchProjects(searchQuery, sortBy, projectsPage);
      await fetchReviews(projectId, 1);
    } catch (err: any) {
      console.error("Docs generation trigger error:", err);
      alert(err.response?.data?.message || "Documentation generation execution failed.");
    } finally {
      setRunningDocs(false);
    }
  };

  // Delete a specific review run (Day 11)
  const deleteReview = async (reviewId: number) => {
    if (!confirm("Are you sure you want to permanently delete this audit record from your history?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('devgauge_token');
      await axios.delete(`${API_URL}/api/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh review history log lists
      if (selectedProject) {
        const reviews = await fetchReviews(selectedProject.id, reviewsPage);
        if (reviews) {
          // Update selection states
          setSelectedReviewIds(prev => {
            const updated = { ...prev };
            if (updated.static === reviewId) {
              updated.static = reviews.find((r: any) => r.review_type === 'static' || r.review_type === 'linter')?.id || null;
            }
            if (updated.ai === reviewId) {
              updated.ai = reviews.find((r: any) => r.review_type === 'ai')?.id || null;
            }
            if (updated.complexity === reviewId) {
              updated.complexity = reviews.find((r: any) => r.review_type === 'complexity')?.id || null;
            }
            if (updated.documentation === reviewId) {
              updated.documentation = reviews.find((r: any) => r.review_type === 'documentation')?.id || null;
            }
            return updated;
          });
        }
      }
      fetchProjects(searchQuery, sortBy, projectsPage); // Update sidebar overview scores
    } catch (err: any) {
      console.error("Delete review error:", err);
      // Swallow 404 Not Found if it was already deleted by a double click
      if (err.response?.status !== 404) {
        alert(err.response?.data?.message || "Failed to delete review record.");
      }
    }
  };

  // Delete an entire project (Day 11)
  const deleteProject = async (projectId: number) => {
    if (!selectedProject) return;

    const typedName = prompt(
      `WARNING: You are about to permanently delete this project, including its source code file and all associated static/AI/complexity/documentation audits. This action CANNOT be undone.\n\nTo confirm, please type the project name "${selectedProject.project_name}" below:`
    );

    if (typedName !== selectedProject.project_name) {
      alert("Project name confirmation mismatch. Deletion cancelled.");
      return;
    }

    try {
      const token = localStorage.getItem('devgauge_token');
      await axios.delete(`${API_URL}/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSelectedProject(null);
      setProjectCode("");
      setSelectedReviewIds({ static: null, ai: null, complexity: null, documentation: null });
      fetchProjects(searchQuery, sortBy, projectsPage);
    } catch (err: any) {
      console.error("Delete project error:", err);
      // Swallow 404 Not Found if it was already deleted by a double click
      if (err.response?.status !== 404) {
        alert(err.response?.data?.message || "Failed to delete project.");
      }
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
                  fetchProjects(searchQuery, sortBy, projectsPage); 
                  if (selectedProject) {
                    handleSelectProject(selectedProject);
                  }
                }} 
              />
            </div>
          ) : selectedProject ? (
            /* UNIFIED PROJECT DETAIL VIEW PANEL (Day 11) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Panel: Project details, Tabs Switcher, and Tab Content (takes 2 cols) */}
              <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-6">
                
                {/* Project Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                      <FileCode className="w-5.5 h-5.5 text-violet-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{selectedProject.project_name}</h3>
                      <p className="text-zinc-500 text-[10px] flex items-center gap-1.5 mt-0.5">
                        <Code className="w-3.5 h-3.5" /> Language: <span className="uppercase text-zinc-300 font-bold">{selectedProject.language}</span>
                        <span>•</span>
                        <Calendar className="w-3.5 h-3.5" /> Created: <span className="text-zinc-300">{new Date(selectedProject.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedProject(null); setProjectCode(""); }}
                    className="px-3 h-8.5 rounded-xl border border-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs font-semibold cursor-pointer transition-all duration-200"
                  >
                    Close Project
                  </button>
                </div>

                {/* Tabs Switcher */}
                <div className="flex border-b border-zinc-900 p-0.5 bg-zinc-950/40 rounded-xl">
                  {(['static', 'ai', 'complexity', 'documentation', 'code'] as const).map((tab) => {
                    const isActive = activeDetailTab === tab;
                    const label = tab === 'static' ? 'Static Analysis'
                                : tab === 'ai' ? 'AI Review'
                                : tab === 'complexity' ? 'Complexity'
                                : tab === 'documentation' ? 'Documentation'
                                : 'Source Code';
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveDetailTab(tab)}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all duration-200 ${
                          isActive 
                            ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800' 
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content panel */}
                <div className="flex-1">
                  {activeDetailTab === 'code' ? (
                    /* Code Preview Tab */
                    <div className="flex flex-col gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                        <Code className="w-3.5 h-3.5" /> File Code Preview
                      </span>
                      {loadingCode ? (
                        <div className="h-64 rounded-xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-center text-xs text-zinc-500 gap-2">
                          <Loader2 className="w-4.5 h-4.5 animate-spin" /> Loading source file...
                        </div>
                      ) : (
                        <div className="max-h-[500px] overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-900/80 p-4 font-mono text-[11px] text-zinc-300 leading-relaxed scrollbar-thin">
                          <pre className="whitespace-pre">{projectCode}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Review Tab Content */
                    (() => {
                      const activeReviewId = selectedReviewIds[activeDetailTab];
                      if (activeReviewId) {
                        return (
                          <div className="max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                            <ReviewResults reviewId={activeReviewId} hideHeader={true} />
                          </div>
                        );
                      }
                      
                      // Empty state with Action call to run the review
                      const typeLabel = activeDetailTab === 'static' ? 'Static Linter Scan'
                                      : activeDetailTab === 'ai' ? 'AI Review Audit'
                                      : activeDetailTab === 'complexity' ? 'Complexity Metrics Scan'
                                      : 'Auto-Documentation wiki';
                      const triggerFn = activeDetailTab === 'static' ? () => runStaticAnalysis(selectedProject.id)
                                      : activeDetailTab === 'ai' ? () => runAIReview(selectedProject.id)
                                      : activeDetailTab === 'complexity' ? () => runComplexityAnalysis(selectedProject.id)
                                      : () => runDocsGeneration(selectedProject.id);
                      const isRunning = activeDetailTab === 'static' ? analyzing
                                      : activeDetailTab === 'ai' ? runningAI
                                      : activeDetailTab === 'complexity' ? runningComplexity
                                      : runningDocs;
                      const runLabel = 'Run this analysis';

                      const lang = (selectedProject?.language || '').toLowerCase();
                      const isUnsupportedComplexity = activeDetailTab === 'complexity' && !['javascript', 'js', 'python', 'py'].includes(lang);
                      const isUnsupportedStatic = activeDetailTab === 'static' && !['javascript', 'js', 'typescript', 'ts', 'python', 'py'].includes(lang);
                      const isUnsupported = isUnsupportedComplexity || isUnsupportedStatic;
                      
                      const errorMsg = isUnsupportedComplexity
                        ? "Complexity analysis is only supported for JavaScript and Python projects."
                        : "Static linter scan is only supported for JavaScript, TypeScript, and Python projects.";

                      return (
                        <div className="py-16 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 text-center flex flex-col items-center justify-center gap-4">
                          <AlertTriangle className="w-8 h-8 text-zinc-650" />
                          <div className="flex flex-col gap-1">
                            <h4 className="text-zinc-300 font-bold text-xs">
                              {isUnsupported ? "Analysis Not Supported" : "No analysis data found"}
                            </h4>
                            <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                              {isUnsupported 
                                ? errorMsg 
                                : `You haven't generated a ${typeLabel} for this version of the project yet. Click the trigger button below to launch the engine.`}
                            </p>
                          </div>
                          {!isUnsupported && (
                            <button
                              onClick={triggerFn}
                              disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                              className="mt-2 px-6 h-9.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold shadow-md shadow-violet-600/15 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
                            >
                              {isRunning ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing Run...
                                </span>
                              ) : (
                                runLabel
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Right Panel: Actions, Chronological Timeline & Deletes (takes 1 col) */}
              <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col justify-between gap-6 min-h-[550px]">
                
                {/* Timeline section */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-500" />
                    Audit Logs Timeline
                  </h3>

                  {/* Filter timeline reviews list */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Runs History Log</span>
                    
                    {reviewsFetchError ? (
                      <div className="py-8 px-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center flex flex-col items-center justify-center gap-2">
                        <span className="text-[10px] text-red-400 font-semibold">{reviewsFetchError}</span>
                        <button 
                          onClick={() => selectedProject && handleSelectProject(selectedProject)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] text-zinc-300 font-bold transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Retry
                        </button>
                      </div>
                    ) : fetchingReviews ? (
                      <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> Loading timeline...
                      </div>
                    ) : projectReviews.length === 0 ? (
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-[10px] text-zinc-500 leading-relaxed">
                        This project has no past review runs. Use the quick controls below to audit code.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
                        {projectReviews.map((rev) => {
                          const isStatic = rev.review_type === 'static' || rev.review_type === 'linter';
                          const isAI = rev.review_type === 'ai';
                          const isComplexity = rev.review_type === 'complexity';
                          const isDocs = rev.review_type === 'documentation';

                          const reviewTypeKey = isStatic ? 'static' : isAI ? 'ai' : isComplexity ? 'complexity' : 'documentation';
                          const isCurrentActive = selectedReviewIds[reviewTypeKey] === rev.id && activeDetailTab === reviewTypeKey;

                          const labelText = isStatic ? 'LINTER'
                                          : isAI ? 'AI AUDIT'
                                          : isComplexity ? 'COMPLEXITY'
                                          : 'API DOCS';

                          const labelColor = isStatic ? 'bg-cyan-950/30 text-cyan-400 border-cyan-900/30'
                                           : isAI ? 'bg-pink-950/30 text-pink-400 border-pink-900/30'
                                           : isComplexity ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                                           : 'bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-900/30';

                          return (
                            <div 
                              key={rev.id}
                              className={`p-3 rounded-xl border flex justify-between items-center transition-all duration-150 relative ${
                                isCurrentActive 
                                  ? 'border-violet-500/30 bg-violet-950/5' 
                                  : 'border-zinc-900 bg-zinc-950/20'
                              }`}
                            >
                              <div className="flex flex-col text-left min-w-0 pr-6">
                                <span className="text-[10px] font-semibold text-zinc-350 truncate">
                                  {new Date(rev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                <span className="text-[9px] text-zinc-550 truncate mt-1 flex items-center gap-1.5">
                                  <span className={`px-1 rounded-[4px] border text-[8px] font-extrabold tracking-wider ${labelColor}`}>
                                    {labelText}
                                  </span>
                                  <span className="truncate">{rev.summary}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    // Navigate directly to the standalone report details page
                                    router.push(`/reviews/${rev.id}`);
                                  }}
                                  className="text-[9px] text-violet-400 hover:text-violet-300 hover:underline font-bold cursor-pointer mr-1"
                                >
                                  View
                                </button>

                                {rev.overall_score !== null && rev.overall_score !== undefined && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                    rev.overall_score >= 90 
                                      ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/20' 
                                      : rev.overall_score >= 70 
                                      ? 'bg-violet-950/20 text-violet-400 border-violet-900/20'
                                      : 'bg-amber-950/20 text-amber-400 border-amber-900/20'
                                  }`}>
                                    {rev.overall_score}
                                  </span>
                                )}
                                
                                <button
                                  onClick={() => deleteReview(rev.id)}
                                  className="w-7 h-7 rounded-lg border border-zinc-900 hover:border-red-950 bg-zinc-950/40 text-zinc-500 hover:text-red-400 hover:bg-red-950/10 flex items-center justify-center transition-all cursor-pointer"
                                  title="Delete Review Run"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        
                        {reviewsPagination.pages > 1 && (
                          <div className="flex items-center justify-between border-t border-zinc-900 pt-3 mt-2">
                            <button
                              disabled={reviewsPage === 1}
                              onClick={() => setReviewsPage(prev => Math.max(1, prev - 1))}
                              className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-[9px] text-zinc-355 font-bold transition-all cursor-pointer"
                            >
                              Prev
                            </button>
                            <span className="text-[9px] text-zinc-500 font-bold">
                              Page {reviewsPage} of {reviewsPagination.pages}
                            </span>
                            <button
                              disabled={reviewsPage === reviewsPagination.pages}
                              onClick={() => setReviewsPage(prev => Math.min(reviewsPagination.pages, prev + 1))}
                              className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-[9px] text-zinc-355 font-bold transition-all cursor-pointer"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Auditing Triggers & Project Deletion Control */}
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Linter Trigger Button */}
                     <button
                      onClick={() => {
                        const lang = (selectedProject?.language || '').toLowerCase();
                        if (!['javascript', 'js', 'typescript', 'ts', 'python', 'py'].includes(lang)) {
                          alert("Static linter scan is only supported for JavaScript, TypeScript, and Python projects.");
                          return;
                        }
                        runStaticAnalysis(selectedProject.id);
                      }}
                      disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                      className={`flex items-center justify-center gap-1.5 h-9 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                        ['javascript', 'js', 'typescript', 'ts', 'python', 'py'].includes((selectedProject?.language || '').toLowerCase())
                          ? "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
                          : "bg-zinc-950 border-zinc-900 text-zinc-650 opacity-40 cursor-not-allowed"
                      }`}
                      title={!['javascript', 'js', 'typescript', 'ts', 'python', 'py'].includes((selectedProject?.language || '').toLowerCase()) ? "Static linter only supports JS, TS, and Python" : ""}
                    >
                      {analyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current text-cyan-400" />
                          Lint Audit
                        </>
                      )}
                    </button>

                    {/* AI Review Trigger Button (Prompt 4) */}
                    <button
                      onClick={() => runAIReview(selectedProject.id)}
                      disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                      className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-[10px] font-bold disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {runningAI ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Cpu className="w-3.5 h-3.5 text-pink-400" />
                          AI Review
                        </>
                      )}
                    </button>

                    {/* Complexity Trigger Button (Day 9) */}
                    <button
                      onClick={() => {
                        const lang = (selectedProject?.language || '').toLowerCase();
                        if (!['javascript', 'js', 'python', 'py'].includes(lang)) {
                          alert("Complexity analysis is only supported for JavaScript and Python projects.");
                          return;
                        }
                        runComplexityAnalysis(selectedProject.id);
                      }}
                      disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                      className={`flex items-center justify-center gap-1.5 h-9 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                        ['javascript', 'js', 'python', 'py'].includes((selectedProject?.language || '').toLowerCase())
                          ? "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
                          : "bg-zinc-950 border-zinc-900 text-zinc-650 opacity-40 cursor-not-allowed"
                      }`}
                      title={!['javascript', 'js', 'python', 'py'].includes((selectedProject?.language || '').toLowerCase()) ? "Complexity analysis only supports JS and Python" : ""}
                    >
                      {runningComplexity ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Hash className="w-3.5 h-3.5 text-emerald-400" />
                          Complexity
                        </>
                      )}
                    </button>

                    {/* Documentation Trigger Button (Day 10) */}
                    <button
                      onClick={() => runDocsGeneration(selectedProject.id)}
                      disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                      className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-[10px] font-bold disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                      {runningDocs ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-fuchsia-400" />
                          Wiki Docs
                        </>
                      )}
                    </button>
                  </div>

                  {/* Danger zone: delete project */}
                  <div className="border-t border-zinc-900 pt-3">
                    <button
                      onClick={() => deleteProject(selectedProject.id)}
                      disabled={analyzing || runningAI || runningComplexity || runningDocs || loadingCode}
                      className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-red-950/40 text-red-500 hover:bg-red-950/15 hover:border-red-900/40 hover:text-red-400 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-45"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Project File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : dashboardTab === 'history' ? (
            /* COMPREHENSIVE HISTORY LISTING VIEW */
            <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col gap-4">
              <h3 className="font-bold text-white text-sm border-b border-zinc-900 pb-4">Audited Project Records</h3>
              
              {/* Search & Sort Panel */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by name or code content..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all duration-200"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <div className="w-full sm:w-44">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-zinc-900/40 bg-zinc-900 text-xs text-zinc-350 focus:outline-none focus:border-violet-500 transition-all duration-200 cursor-pointer"
                  >
                    <option value="newest" className="bg-zinc-950">Newest</option>
                    <option value="oldest" className="bg-zinc-950">Oldest</option>
                    <option value="name" className="bg-zinc-950">Name A-Z</option>
                  </select>
                </div>
              </div>

              {projectFetchError ? (
                <div className="py-8 px-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center flex flex-col items-center justify-center gap-3">
                  <span className="text-xs text-red-400 font-semibold">{projectFetchError}</span>
                  <button 
                    onClick={() => fetchProjects(searchQuery, sortBy)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-300 font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              ) : fetchingProjects ? (
                <div className="py-12 flex justify-center text-xs text-zinc-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" /> Fetching projects...
                </div>
              ) : projects.length === 0 ? (
                <p className="py-10 text-center text-xs text-zinc-500">
                  {searchQuery ? "No projects match your search query." : "No project audit records found."}
                </p>
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
                  
                  {projectsPagination.pages > 1 && (
                    <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-4">
                      <button
                        disabled={projectsPage === 1}
                        onClick={() => setProjectsPage(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-[10px] text-zinc-355 font-bold transition-all cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="text-[10px] text-zinc-500 font-bold">
                        Page {projectsPage} of {projectsPagination.pages}
                      </span>
                      <button
                        disabled={projectsPage === projectsPagination.pages}
                        onClick={() => setProjectsPage(prev => Math.min(projectsPagination.pages, prev + 1))}
                        className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-[10px] text-zinc-355 font-bold transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
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
                
                {projectFetchError ? (
                  <div className="py-8 px-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center flex flex-col items-center justify-center gap-2">
                    <span className="text-[10px] text-red-400 font-semibold">{projectFetchError}</span>
                    <button 
                      onClick={() => fetchProjects()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] text-zinc-300 font-bold transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Retry
                    </button>
                  </div>
                ) : fetchingProjects ? (
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
