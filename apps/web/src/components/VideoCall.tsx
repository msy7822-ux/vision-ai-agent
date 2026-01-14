"use client";

import { useEffect, useState, useCallback } from "react";
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  StreamVideoParticipant,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { StreamChat } from "stream-chat";

import { getCallToken, createCall, joinCallWithAgent } from "@/lib/stream";
import { ObjectLabelOverlay, DetectedObject } from "./ObjectLabelOverlay";

// エージェントの発話テキストから物体名を抽出
function parseObjectsFromMessage(text: string): DetectedObject[] {
  // 除外する単語
  const excludeWords = new Set([
    "i", "see", "can", "and", "the", "a", "an", "is", "are", "there",
    "here", "that", "this", "it", "what", "looks", "like", "also",
  ]);

  // テキストを単語に分割し、名詞らしきものを抽出
  const words = text.toLowerCase().split(/[\s,.']+/);
  const objects: DetectedObject[] = [];

  for (const word of words) {
    if (word.length > 2 && !excludeWords.has(word)) {
      objects.push({
        name: word,
        confidence: "high",
      });
    }
  }

  // 重複を除去して最大5つまで
  const unique = objects.filter(
    (obj, idx, arr) => arr.findIndex((o) => o.name === obj.name) === idx
  );
  return unique.slice(0, 5);
}

interface VideoCallProps {
  onObjectsDetected?: (objects: DetectedObject[]) => void;
}

function VideoUI() {
  const { useLocalParticipant, useRemoteParticipants } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Show local participant's video
  if (!localParticipant) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <p className="text-white">Connecting camera...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ParticipantView
        participant={localParticipant}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function VideoCall({ onObjectsDetected }: VideoCallProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);

  const initializeCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get token from API
      const tokenData = await getCallToken();

      // Create Stream Video client
      const videoClient = new StreamVideoClient({
        apiKey: tokenData.api_key,
        user: { id: tokenData.user_id, name: "User" },
        token: tokenData.token,
      });

      // Create Stream Chat client for receiving agent messages
      const chat = StreamChat.getInstance(tokenData.api_key);
      await chat.connectUser(
        { id: tokenData.user_id, name: "User" },
        tokenData.token
      );

      // Create a new call
      const callData = await createCall();

      // Get the call instance
      const videoCall = videoClient.call("default", callData.call_id);

      // Join the call with camera enabled
      await videoCall.join({ create: true });
      await videoCall.camera.enable();

      // Watch the chat channel (same ID as call)
      const channel = chat.channel("messaging", callData.call_id);
      await channel.watch();

      // Listen for new messages from the agent
      // メッセージを累積して物体リストを構築
      let accumulatedObjects: DetectedObject[] = [];
      let lastUpdateTime = 0;

      channel.on("message.new", (event) => {
        if (event.message?.text && event.message.user?.id !== tokenData.user_id) {
          console.log("Agent message:", event.message.text);
          const newObjects = parseObjectsFromMessage(event.message.text);

          // 新しい物体を追加（重複を避ける）
          for (const obj of newObjects) {
            if (!accumulatedObjects.some((o) => o.name === obj.name)) {
              accumulatedObjects.push(obj);
            }
          }

          // 最大5つまでに制限
          if (accumulatedObjects.length > 5) {
            accumulatedObjects = accumulatedObjects.slice(-5);
          }

          // 更新があれば反映
          if (accumulatedObjects.length > 0) {
            setDetectedObjects([...accumulatedObjects]);
            onObjectsDetected?.([...accumulatedObjects]);
          }

          // 3秒後にリセット（新しい発話のため）
          const now = Date.now();
          lastUpdateTime = now;
          setTimeout(() => {
            if (lastUpdateTime === now) {
              accumulatedObjects = [];
            }
          }, 3000);
        }
      });

      // Have the agent join the call
      await joinCallWithAgent(callData.call_id);

      setClient(videoClient);
      setCall(videoCall);
      setChatClient(chat);
      setIsConnecting(false);

    } catch (err) {
      console.error("Failed to initialize call:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  }, [onObjectsDetected]);

  useEffect(() => {
    initializeCall();

    return () => {
      if (call) {
        call.leave();
      }
      if (client) {
        client.disconnectUser();
      }
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
        <p className="mb-4 text-red-500">Error: {error}</p>
        <button
          onClick={initializeCall}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isConnecting || !client || !call) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-white">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <div className="relative h-screen w-screen overflow-hidden bg-black">
          <VideoUI />
          <ObjectLabelOverlay objects={detectedObjects} />
        </div>
      </StreamCall>
    </StreamVideo>
  );
}
