"use client";

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReviewResults from '../../components/ReviewResults';

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = Number(params?.id);

  if (!reviewId || isNaN(reviewId)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-sans">
        <p className="text-sm">Invalid code review identification parameters.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none" />

      <main className="flex-1 p-8 max-w-5xl w-full mx-auto flex flex-col justify-center relative z-10 min-h-screen">
        <div className="p-6.5 rounded-2xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-md shadow-2xl shadow-black/40">
          <ReviewResults 
            reviewId={reviewId} 
            onClose={() => router.push('/dashboard')} 
          />
        </div>
      </main>
    </div>
  );
}
