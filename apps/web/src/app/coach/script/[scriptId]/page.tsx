"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ScriptSession } from "@/components/coach/ScriptSession";
import { Difficulty } from "@/lib/script-api";

function ScriptPracticeContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const scriptId = params.scriptId as string;
  const level = (searchParams.get("level") as Difficulty) || "beginner";

  return (
    <ScriptSession
      scriptId={scriptId}
      level={level}
      onSessionEnd={(data) => {
        console.log("Session ended:", data);
      }}
    />
  );
}

export default function ScriptPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
            <p className="text-white">Loading...</p>
          </div>
        </div>
      }
    >
      <ScriptPracticeContent />
    </Suspense>
  );
}
