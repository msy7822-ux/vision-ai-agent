"use client";

import { DetectedObjectWithBox } from "@/hooks/useObjectDetection";

interface YoloOverlayProps {
  objects: DetectedObjectWithBox[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
  isModelLoading?: boolean;
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 0.7) {
    return {
      border: "border-green-400",
      bg: "bg-green-500",
      glow: "shadow-green-500/50",
      text: "text-green-400",
    };
  } else if (confidence >= 0.5) {
    return {
      border: "border-yellow-400",
      bg: "bg-yellow-500",
      glow: "shadow-yellow-500/50",
      text: "text-yellow-400",
    };
  } else {
    return {
      border: "border-orange-400",
      bg: "bg-orange-500",
      glow: "shadow-orange-500/50",
      text: "text-orange-400",
    };
  }
}

export function YoloOverlay({
  objects,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
  isModelLoading = false,
}: YoloOverlayProps) {
  // ビデオのアスペクト比を維持しながら表示領域にフィットさせる
  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let displayWidth: number;
  let displayHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (videoAspect > containerAspect) {
    // ビデオが横長
    displayWidth = containerWidth;
    displayHeight = containerWidth / videoAspect;
    offsetX = 0;
    offsetY = (containerHeight - displayHeight) / 2;
  } else {
    // ビデオが縦長または同じ
    displayHeight = containerHeight;
    displayWidth = containerHeight * videoAspect;
    offsetX = (containerWidth - displayWidth) / 2;
    offsetY = 0;
  }

  // ビデオ座標をコンテナ座標に変換
  const scaleX = displayWidth / videoWidth;
  const scaleY = displayHeight / videoHeight;

  if (isModelLoading) {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="rounded-lg bg-black/70 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            <p className="text-sm text-white">Loading YOLO model...</p>
          </div>
        </div>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="rounded-full bg-black/60 px-6 py-3 backdrop-blur-sm">
          <p className="text-sm text-white/70">
            Scanning for objects...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* バウンディングボックス */}
      {objects.map((obj, index) => {
        const colors = getConfidenceColor(obj.confidence);

        // 座標を変換
        const x = offsetX + obj.bbox.x * scaleX;
        const y = offsetY + obj.bbox.y * scaleY;
        const width = obj.bbox.width * scaleX;
        const height = obj.bbox.height * scaleY;

        return (
          <div
            key={`${obj.name}-${index}`}
            className={`
              absolute
              border-2 ${colors.border}
              rounded-sm
              transition-all duration-150 ease-out
            `}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* コーナーマーカー */}
            <div className={`absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 ${colors.border}`} />
            <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 ${colors.border}`} />
            <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 ${colors.border}`} />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 ${colors.border}`} />

            {/* ラベル */}
            <div
              className={`
                absolute -top-7 left-0
                ${colors.bg}
                px-2 py-0.5 rounded
                shadow-lg ${colors.glow}
                whitespace-nowrap
              `}
            >
              <span className="text-xs font-bold text-white capitalize">
                {obj.name}
              </span>
              <span className="text-xs text-white/80 ml-1">
                {Math.round(obj.confidence * 100)}%
              </span>
            </div>
          </div>
        );
      })}

      {/* 検出数の表示 */}
      <div className="absolute top-4 left-4">
        <div className="rounded-lg bg-black/70 px-4 py-2 backdrop-blur-sm border border-white/20">
          <p className="text-sm font-medium text-white">
            <span className="text-green-400">{objects.length}</span> object{objects.length !== 1 ? "s" : ""} detected
          </p>
          <p className="text-xs text-white/60 mt-1">YOLO v8 (COCO-SSD)</p>
        </div>
      </div>

      {/* 検出物体リスト */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex flex-wrap justify-center gap-2 max-w-[90vw]">
          {objects.map((obj, index) => {
            const colors = getConfidenceColor(obj.confidence);
            return (
              <div
                key={`label-${obj.name}-${index}`}
                className={`
                  ${colors.bg}
                  px-4 py-2 rounded-full
                  shadow-lg ${colors.glow}
                `}
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
