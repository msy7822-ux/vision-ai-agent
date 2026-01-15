"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getScripts, ScriptInfo, Category, Difficulty } from "@/lib/script-api";

const categoryIcons: Record<Category, string> = {
  daily: "☕",
  travel: "✈️",
  business: "💼",
};

const categoryLabels: Record<Category, string> = {
  daily: "Daily",
  travel: "Travel",
  business: "Business",
};

const difficultyColors: Record<Difficulty, string> = {
  beginner: "bg-green-600/20 text-green-400",
  intermediate: "bg-yellow-600/20 text-yellow-400",
  advanced: "bg-red-600/20 text-red-400",
};

function ScriptSelectionContent() {
  const searchParams = useSearchParams();
  const level = (searchParams.get("level") as Difficulty) || "beginner";
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");

  useEffect(() => {
    async function fetchScripts() {
      try {
        const data = await getScripts();
        setScripts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scripts");
      } finally {
        setLoading(false);
      }
    }
    fetchScripts();
  }, []);

  const filteredScripts = filterCategory === "all"
    ? scripts
    : scripts.filter((s) => s.category === filterCategory);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading scripts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const capitalizeLevel = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/coach"
          className="text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Mode Selection
        </Link>
      </div>

      <div className="mb-12 text-center">
        <h1 className="mb-4 text-3xl font-bold text-white">
          Script Practice
        </h1>
        <p className="text-slate-300">
          Practice conversations with guided scripts
        </p>
        <div className="mt-2 inline-block rounded-full bg-blue-600/20 px-4 py-1 text-sm text-blue-400">
          Level: {capitalizeLevel}
        </div>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={"rounded-full px-4 py-2 text-sm transition-colors " + (
            filterCategory === "all"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          )}
        >
          All
        </button>
        {(["daily", "travel", "business"] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={"rounded-full px-4 py-2 text-sm transition-colors " + (
              filterCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            {categoryIcons[cat]} {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredScripts.map((script) => (
          <Link
            key={script.id}
            href={"/coach/script/" + script.id + "?level=" + level}
            className="group relative overflow-hidden rounded-2xl bg-slate-800 p-6 transition-all hover:bg-slate-700 hover:shadow-xl hover:shadow-blue-900/20"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{categoryIcons[script.category]}</div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-white">
                    {script.title}
                  </h3>
                  <span className={"rounded px-2 py-0.5 text-xs " + difficultyColors[script.difficulty]}>
                    {script.difficulty.charAt(0).toUpperCase() + script.difficulty.slice(1)}
                  </span>
                </div>
                <p className="mb-2 text-sm text-slate-400">{script.title_ja}</p>
                <p className="mb-3 text-sm text-slate-300">{script.description}</p>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{script.estimated_minutes} min</span>
                  <span>{script.line_count} lines</span>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-0 bg-blue-500 transition-all group-hover:w-full" />
          </Link>
        ))}
      </div>

      {filteredScripts.length === 0 && (
        <div className="text-center text-slate-400 py-12">
          No scripts found for this category.
        </div>
      )}
    </main>
  );
}

export default function ScriptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <ScriptSelectionContent />
    </Suspense>
  );
}
