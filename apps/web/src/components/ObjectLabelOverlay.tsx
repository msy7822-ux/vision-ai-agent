"use client";

import { useEffect, useState } from "react";

export interface DetectedObject {
  name: string;
  confidence: "high" | "medium" | "low";
}

interface ObjectLabelOverlayProps {
  objects: DetectedObject[];
}

const confidenceColors = {
  high: {
    border: "border-green-400",
    bg: "bg-green-500",
    glow: "shadow-green-500/50",
  },
  medium: {
    border: "border-yellow-400",
    bg: "bg-yellow-500",
    glow: "shadow-yellow-500/50",
  },
  low: {
    border: "border-orange-400",
    bg: "bg-orange-500",
    glow: "shadow-orange-500/50",
  },
};

// 物体ごとにランダムな位置を生成（画面内に収まるように）
function generateBoxPositions(count: number): { top: number; left: number; width: number; height: number }[] {
  const positions: { top: number; left: number; width: number; height: number }[] = [];

  // グリッドベースの配置で重なりを防ぐ
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const cellWidth = 80 / cols;
  const cellHeight = 70 / rows;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // セル内でランダムなオフセットを追加
    const randomOffsetX = (Math.random() - 0.5) * 10;
    const randomOffsetY = (Math.random() - 0.5) * 10;

    positions.push({
      top: 10 + row * cellHeight + randomOffsetY,
      left: 10 + col * cellWidth + randomOffsetX,
      width: Math.min(cellWidth * 0.8, 25 + Math.random() * 15),
      height: Math.min(cellHeight * 0.8, 20 + Math.random() * 15),
    });
  }

  return positions;
}

export function ObjectLabelOverlay({ objects }: ObjectLabelOverlayProps) {
  const [positions, setPositions] = useState<{ top: number; left: number; width: number; height: number }[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (objects.length > 0) {
      setPositions(generateBoxPositions(objects.length));
      // フェードインのためのディレイ
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [objects.length]);

  if (objects.length === 0) {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="rounded-full bg-black/60 px-6 py-3 backdrop-blur-sm">
          <p className="text-sm text-white/70">
            Waiting for object detection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* バウンディングボックス */}
      {objects.map((obj, index) => {
        const pos = positions[index];
        if (!pos) return null;

        const colors = confidenceColors[obj.confidence];

        return (
          <div
            key={`${obj.name}-${index}`}
            className={`
              absolute
              border-2 ${colors.border}
              rounded-lg
              transition-all duration-500 ease-out
              ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
            `}
            style={{
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              width: `${pos.width}%`,
              height: `${pos.height}%`,
              transitionDelay: `${index * 100}ms`,
            }}
          >
            {/* コーナーマーカー */}
            <div className={`absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 ${colors.border} rounded-tl`} />
            <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 ${colors.border} rounded-tr`} />
            <div className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 ${colors.border} rounded-bl`} />
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 ${colors.border} rounded-br`} />

            {/* ラベル */}
            <div
              className={`
                absolute -top-8 left-1/2 -translate-x-1/2
                ${colors.bg}
                px-3 py-1 rounded-md
                shadow-lg ${colors.glow}
                whitespace-nowrap
              `}
            >
              <span className="text-sm font-bold text-white capitalize">
                {obj.name}
              </span>
            </div>

            {/* パルスアニメーション */}
            <div
              className={`
                absolute inset-0
                border-2 ${colors.border}
                rounded-lg
                animate-ping
                opacity-30
              `}
            />
          </div>
        );
      })}

      {/* 検出数の表示 */}
      <div className="absolute top-4 left-4">
        <div className="rounded-lg bg-black/60 px-4 py-2 backdrop-blur-sm border border-white/20">
          <p className="text-sm font-medium text-white">
            <span className="text-green-400">{objects.length}</span> object{objects.length !== 1 ? "s" : ""} detected
          </p>
        </div>
      </div>

      {/* 検出物体リスト */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex flex-wrap justify-center gap-2 max-w-[90vw]">
          {objects.map((obj, index) => {
            const colors = confidenceColors[obj.confidence];
            return (
              <div
                key={`label-${obj.name}-${index}`}
                className={`
                  ${colors.bg}
                  px-4 py-2 rounded-full
                  shadow-lg ${colors.glow}
                  transform transition-all duration-300
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <span className="text-base font-semibold text-white capitalize">
                  {obj.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
