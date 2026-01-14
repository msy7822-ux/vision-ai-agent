"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { LocalVideoDetector } from "@/components/LocalVideoDetector";
import { DetectedObjectWithBox } from "@/hooks/useObjectDetection";

export default function YoloPage() {
  const [lastSpokenObjects, setLastSpokenObjects] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastAnnouncementRef = useRef<number>(0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Web Speech API で英語を発音
  const speakObjects = useCallback((objects: DetectedObjectWithBox[]) => {
    if (objects.length === 0) return;
    if (isSpeaking) return;

    // 3秒以内の再発音を防ぐ
    const now = Date.now();
    if (now - lastAnnouncementRef.current < 3000) return;

    // オブジェクト名のリストを作成
    const objectNames = objects.map((o) => o.name);

    // 前回と同じなら発音しない
    if (
      objectNames.length === lastSpokenObjects.length &&
      objectNames.every((name, i) => name === lastSpokenObjects[i])
    ) {
      return;
    }

    lastAnnouncementRef.current = now;
    setLastSpokenObjects(objectNames);
    setIsSpeaking(true);

    // 発話テキストを構築
    let text: string;
    if (objectNames.length === 1) {
      text = `I see a ${objectNames[0]}`;
    } else if (objectNames.length === 2) {
      text = `I see a ${objectNames[0]} and a ${objectNames[1]}`;
    } else {
      const lastObj = objectNames.pop();
      text = `I see a ${objectNames.join(", a ")}, and a ${lastObj}`;
    }

    // Web Speech API で発音
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, lastSpokenObjects]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleObjectsDetected = useCallback(
    (objects: DetectedObjectWithBox[]) => {
      speakObjects(objects);
    },
    [speakObjects]
  );

  return (
    <div className="relative">
      <LocalVideoDetector onObjectsDetected={handleObjectsDetected} />

      {/* 発話中インジケーター */}
      {isSpeaking && (
        <div className="absolute top-4 right-4 z-50">
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/90 px-4 py-2 backdrop-blur-sm">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm font-medium text-white">Speaking...</span>
          </div>
        </div>
      )}

      {/* モード表示 */}
      <div className="absolute bottom-20 right-4 z-50">
        <div className="rounded-lg bg-black/70 px-4 py-2 backdrop-blur-sm">
          <p className="text-xs text-white/80">Mode: YOLO + Web Speech API</p>
        </div>
      </div>
    </div>
  );
}
