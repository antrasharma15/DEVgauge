"use client";

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, UploadCloud, Folder, FileCode } from 'lucide-react';

interface UploadCodeProps {
  onSuccess?: (project: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function UploadCode({ onSuccess }: UploadCodeProps) {
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Auto-populate project name with file name if not already set
      if (!projectName) {
        setProjectName(selectedFile.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!file) {
      setStatus({ type: 'error', message: 'Please select a file to upload.' });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('devgauge_token');
      
      // Construct Multipart FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_name', projectName.trim() || file.name);

      const response = await axios.post(
        `${API_URL}/api/projects/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setLoading(false);
      setStatus({ 
        type: 'success', 
        message: `Project "${response.data.project_name}" created from file upload successfully!` 
      });

      // Reset form
      setProjectName('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Failed to upload code file. Please try again.';
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

      {/* Project Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5" />
          Project Name
        </label>
        <input
          type="text"
          placeholder="e.g. Database Utils (will default to filename if empty)"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={loading}
          className="w-full h-11 px-4 rounded-xl bg-zinc-950/60 border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-sm placeholder-zinc-600 transition-all duration-200 outline-none disabled:opacity-50"
        />
      </div>

      {/* Drag & Drop File Upload Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5" />
          Upload Source File
        </label>
        <div 
          onClick={() => !loading && fileInputRef.current?.click()}
          className="h-44 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 focus-within:border-violet-500 hover:border-zinc-700 hover:bg-zinc-950/60 transition-all duration-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer relative"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={loading}
            accept=".js,.py,.java,.cpp,.ts"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
            <UploadCloud className="w-5.5 h-5.5 text-zinc-400" />
          </div>

          {file ? (
            <div className="flex flex-col gap-1 items-center">
              <span className="text-sm font-semibold text-zinc-200 truncate max-w-xs">{file.name}</span>
              <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(2)} KB</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 items-center">
              <span className="text-sm font-medium text-zinc-300">Click to select files</span>
              <span className="text-xs text-zinc-600">Supports .js, .py, .java, .cpp, .ts files</span>
            </div>
          )}
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
            Uploading file...
          </>
        ) : (
          "Upload & Submit Code"
        )}
      </button>
    </form>
  );
}
