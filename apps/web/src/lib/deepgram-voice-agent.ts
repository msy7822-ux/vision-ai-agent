/**
 * Deepgram Voice Agent Client
 *
 * Handles direct WebSocket connection to Deepgram Voice Agent API
 * for real-time voice conversations (Speech-to-Speech).
 */

export interface VoiceAgentConfig {
  apiKey: string;
  prompt: string;
  greeting: string;
  voice?: string;
  listenModel?: string;
  thinkProvider?: string;
  thinkModel?: string;
}

export interface VoiceAgentCallbacks {
  onTranscript?: (role: "user" | "agent", text: string) => void;
  onUserStartedSpeaking?: () => void;
  onAgentStartedSpeaking?: () => void;
  onAgentThinking?: () => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

const DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse";

export class DeepgramVoiceAgentClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private isConnected = false;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  constructor(
    private config: VoiceAgentConfig,
    private callbacks: VoiceAgentCallbacks = {}
  ) {}

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn("Already connected to Deepgram");
      return;
    }

    try {
      console.log("[Deepgram] Starting connection...");

      // Initialize audio context (16kHz for Deepgram compatibility)
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      console.log("[Deepgram] AudioContext created, state:", this.audioContext.state);

      // Resume audio context (required by browser autoplay policy)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        console.log("[Deepgram] AudioContext resumed");
      }

      // Get microphone access
      console.log("[Deepgram] Requesting microphone access...");
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      console.log("[Deepgram] Microphone access granted");

      // Connect WebSocket
      console.log("[Deepgram] Connecting to WebSocket:", DEEPGRAM_AGENT_URL);
      this.ws = new WebSocket(DEEPGRAM_AGENT_URL, ["token", this.config.apiKey]);

      this.ws.onopen = () => {
        console.log("[Deepgram] WebSocket connected");
        this.sendSettings();
        this.startKeepAlive();
        this.isConnected = true;
        this.callbacks.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.callbacks.onError?.(new Error("WebSocket connection error"));
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected from Deepgram", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this.isConnected = false;
        this.callbacks.onDisconnected?.();
        this.cleanup();
      };

      // Wait for connection to be ready
      console.log("[Deepgram] Waiting for connection...");
      await this.waitForConnection();
      console.log("[Deepgram] Connection ready");

      // Start audio capture after connection is established
      console.log("[Deepgram] Starting audio capture...");
      await this.startAudioCapture();
      console.log("[Deepgram] Audio capture started, connection complete");
    } catch (error) {
      console.error("Failed to connect:", error);
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error("Connection failed")
      );
      throw error;
    }
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      const checkConnection = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(checkConnection);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });
  }

  private sendSettings(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const settings = {
      type: "Settings",
      audio: {
        input: {
          encoding: "linear16",
          sample_rate: 16000,
        },
        output: {
          encoding: "linear16",
          sample_rate: 16000,
          container: "none",
        },
      },
      agent: {
        listen: {
          provider: {
            type: "deepgram",
            model: this.config.listenModel || "nova-3",
          },
        },
        think: {
          provider: {
            type: this.config.thinkProvider || "open_ai",
            model: this.config.thinkModel || "gpt-4o-mini",
          },
          prompt: this.config.prompt,
        },
        speak: {
          provider: {
            type: "deepgram",
            model: this.config.voice || "aura-2-thalia-en",
          },
        },
        greeting: this.config.greeting,
      },
    };

    this.ws.send(JSON.stringify(settings));
    console.log("Sent settings to Deepgram Voice Agent", settings);
  }

  private async startAudioCapture(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) return;

    // Load audio worklet for processing with buffering (4096 samples per chunk)
    const workletCode = `
      class AudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buffer = [];
          this.BUFFER_SIZE = 4096;  // Buffer 4096 samples before sending
        }

        process(inputs) {
          const input = inputs[0];
          if (input && input[0]) {
            const samples = input[0];
            // Accumulate samples in buffer
            for (let i = 0; i < samples.length; i++) {
              this.buffer.push(samples[i]);
            }

            // Send when buffer is full
            while (this.buffer.length >= this.BUFFER_SIZE) {
              const chunk = this.buffer.splice(0, this.BUFFER_SIZE);
              const int16 = new Int16Array(this.BUFFER_SIZE);
              for (let i = 0; i < this.BUFFER_SIZE; i++) {
                const s = Math.max(-1, Math.min(1, chunk[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              this.port.postMessage(int16.buffer, [int16.buffer]);
            }
          }
          return true;
        }
      }
      registerProcessor('audio-processor', AudioProcessor);
    `;

    const blob = new Blob([workletCode], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);

    await this.audioContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioWorklet = new AudioWorkletNode(this.audioContext, "audio-processor");

    this.audioWorklet.port.onmessage = (event) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      }
    };

    source.connect(this.audioWorklet);
    console.log("Audio capture started");
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data instanceof Blob) {
      // Audio data from TTS
      event.data.arrayBuffer().then((buffer) => {
        this.playAudio(buffer);
      });
    } else if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data);
        this.handleJsonMessage(message);
      } catch (e) {
        console.warn("Failed to parse message:", event.data);
      }
    }
  }

  private handleJsonMessage(message: Record<string, unknown>): void {
    const type = message.type as string;
    console.log("[Deepgram] Message:", type, message);

    switch (type) {
      case "Welcome":
        console.log("Received welcome from Deepgram");
        break;

      case "ConversationText":
        const role = (message.role as string) === "user" ? "user" : "agent";
        const content = message.content as string;
        if (content) {
          this.callbacks.onTranscript?.(role, content);
        }
        break;

      case "UserStartedSpeaking":
        this.callbacks.onUserStartedSpeaking?.();
        // Stop current audio playback when user starts speaking
        this.clearAudioQueue();
        break;

      case "AgentStartedSpeaking":
        this.callbacks.onAgentStartedSpeaking?.();
        break;

      case "AgentThinking":
        this.callbacks.onAgentThinking?.();
        break;

      case "Error":
        console.error("Deepgram error:", message);
        this.callbacks.onError?.(new Error(JSON.stringify(message)));
        break;

      default:
        console.log("Unknown message type:", type, message);
    }
  }

  private playAudio(buffer: ArrayBuffer): void {
    if (!this.audioContext) return;

    this.audioQueue.push(buffer);
    if (!this.isPlaying) {
      this.processAudioQueue();
    }
  }

  private async processAudioQueue(): Promise<void> {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    try {
      // Convert linear16 to float32
      const int16Array = new Int16Array(buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Array.length,
        16000
      );
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Track active source for cleanup
      this.activeSourceNodes.push(source);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      source.onended = () => {
        // Remove from active sources
        const index = this.activeSourceNodes.indexOf(source);
        if (index > -1) {
          this.activeSourceNodes.splice(index, 1);
        }
        this.processAudioQueue();
      };
    } catch (error) {
      console.error("Error playing audio:", error);
      this.processAudioQueue();
    }
  }

  private clearAudioQueue(): void {
    // Stop all active audio sources
    this.activeSourceNodes.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Ignore errors if source already stopped
      }
    });
    this.activeSourceNodes = [];
    this.audioQueue = [];
    this.nextPlayTime = this.audioContext?.currentTime || 0;
    this.isPlaying = false;
  }

  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "KeepAlive" }));
      }
    }, 5000);
  }

  setMuted(muted: boolean): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  disconnect(): void {
    this.isConnected = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
