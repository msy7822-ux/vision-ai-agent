"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export interface DetectedObjectWithBox {
  name: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface UseObjectDetectionOptions {
  enabled?: boolean;
  detectionInterval?: number; // ms
  minConfidence?: number;
  maxObjects?: number;
}

export function useObjectDetection(
  videoElement: HTMLVideoElement | null,
  options: UseObjectDetectionOptions = {}
) {
  const {
    enabled = true,
    detectionInterval = 500, // 500msごとに検出
    minConfidence = 0.5,
    maxObjects = 5,
  } = options;

  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObjectWithBox[]>([]);
  const detectionLoopRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);

  // モデルの読み込み
  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Loading COCO-SSD model...");
        const loadedModel = await cocoSsd.load({
          base: "lite_mobilenet_v2", // 軽量モデルを使用
        });
        if (mounted) {
          setModel(loadedModel);
          setIsLoading(false);
          console.log("COCO-SSD model loaded successfully");
        }
      } catch (err) {
        console.error("Failed to load COCO-SSD model:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load model");
          setIsLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      mounted = false;
    };
  }, []);

  // 物体検出の実行
  const detectObjects = useCallback(async () => {
    if (!model || !videoElement || !enabled) return;
    if (videoElement.readyState < 2) return; // ビデオが準備できていない

    const now = Date.now();
    if (now - lastDetectionRef.current < detectionInterval) return;
    lastDetectionRef.current = now;

    try {
      const predictions = await model.detect(videoElement);

      // 信頼度でフィルタリングしてソート
      const filtered = predictions
        .filter((p) => p.score >= minConfidence)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxObjects)
        .map((p) => ({
          name: p.class,
          confidence: p.score,
          bbox: {
            x: p.bbox[0],
            y: p.bbox[1],
            width: p.bbox[2],
            height: p.bbox[3],
          },
        }));

      setDetectedObjects(filtered);
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, [model, videoElement, enabled, detectionInterval, minConfidence, maxObjects]);

  // 検出ループ
  useEffect(() => {
    if (!model || !videoElement || !enabled) return;

    function loop() {
      detectObjects();
      detectionLoopRef.current = requestAnimationFrame(loop);
    }

    detectionLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
    };
  }, [model, videoElement, enabled, detectObjects]);

  return {
    detectedObjects,
    isLoading,
    error,
    isModelReady: !!model,
  };
}
