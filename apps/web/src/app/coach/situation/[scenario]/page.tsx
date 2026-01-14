"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CoachSession } from "@/components/coach/CoachSession";

const scenarioInfo: Record<string, { title: string; titleJa: string; icon: string }> = {
  restaurant: { title: "Restaurant", titleJa: "レストラン注文", icon: "🍽️" },
  directions: { title: "Asking Directions", titleJa: "道案内", icon: "🗺️" },
  hotel: { title: "Hotel Check-in", titleJa: "ホテルチェックイン", icon: "🏨" },
  shopping: { title: "Shopping", titleJa: "ショッピング", icon: "🛍️" },
};

function ScenarioContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const scenario = params.scenario as string;
  const level = (searchParams.get("level") || "beginner") as "beginner" | "intermediate" | "advanced";

  const info = scenarioInfo[scenario] || { title: "Unknown", titleJa: "", icon: "❓" };

  return (
    <CoachSession
      mode="situation"
      level={level}
      scenario={scenario}
      scenarioTitle={info.title}
      scenarioTitleJa={info.titleJa}
      scenarioIcon={info.icon}
    />
  );
}

export default function ScenarioPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-white">Loading scenario...</p>
        </div>
      </div>
    }>
      <ScenarioContent />
    </Suspense>
  );
}
