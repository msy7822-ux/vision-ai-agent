"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useObjectDetection, DetectedObjectWithBox } from "@/hooks/useObjectDetection";
import { YoloOverlay } from "./YoloOverlay";

interface LocalVideoDetectorProps {
  onObjectsDetected?: (objects: DetectedObjectWithBox[]) => void;
}

export function LocalVideoDetector({ onObjectsDetected }: LocalVideoDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    videoWidth: 640,
    videoHeight: 480,
    containerWidth: 0,
    containerHeight: 0,
  });

  const { detectedObjects, isLoading, isModelReady } = useObjectDetection(
    videoElement,
    {
      enabled: isVideoReady,
      detectionInterval: 300, // 300msごとに検出
      minConfidence: 0.5,
      maxObjects: 10,
    }
  );

  // 検出結果を親コンポーネントに通知
  useEffect(() => {
    if (detectedObjects.length > 0) {
      onObjectsDetected?.(detectedObjects);
    }
  }, [detectedObjects, onObjectsDetected]);

  // コンテナサイズの更新
  useEffect(() => {
    function updateContainerSize() {
      if (containerRef.current) {
        setDimensions((prev) => ({
          ...prev,
          containerWidth: containerRef.current!.clientWidth,
          containerHeight: containerRef.current!.clientHeight,
        }));
      }
    }

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, []);

  // カメラの初期化
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // 背面カメラを優先
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            setDimensions((prev) => ({
              ...prev,
              videoWidth: videoRef.current!.videoWidth,
              videoHeight: videoRef.current!.videoHeight,
            }));
            setVideoElement(videoRef.current);
            setIsVideoReady(true);
          }
        };
      }
    } catch (err) {
      console.error("Failed to access camera:", err);
      setError(err instanceof Error ? err.message : "Failed to access camera");
    }
  }, []);

  useEffect(() => {
    initializeCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initializeCamera]);

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
        <p className="mb-4 text-red-500">Error: {error}</p>
        <button
          onClick={initializeCamera}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden bg-black"
    >
      {/* ビデオ表示 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-contain"
      />

      {/* YOLO オーバーレイ */}
      <YoloOverlay
        objects={detectedObjects}
        videoWidth={dimensions.videoWidth}
        videoHeight={dimensions.videoHeight}
        containerWidth={dimensions.containerWidth}
        containerHeight={dimensions.containerHeight}
        isModelLoading={isLoading}
      />

      {/* モデル状態表示 */}
      {!isModelReady && !isLoading && (
        <div className="absolute top-4 right-4">
          <div className="rounded-lg bg-red-500/80 px-4 py-2">
            <p className="text-sm text-white">Model failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
}
