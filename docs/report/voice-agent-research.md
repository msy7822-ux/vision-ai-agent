# 音声AIエージェント実装リサーチ: Deepgram Voice Agent vs Vision Agents STS

> リサーチ日: 2026年1月15日

## 目次
1. [概要比較](#1-概要比較)
2. [Deepgram Voice Agent 詳細](#2-deepgram-voice-agent-詳細)
3. [Vision Agents STS 詳細](#3-vision-agents-sts-詳細)
4. [アーキテクチャの違い](#4-アーキテクチャの違い)
5. [実装方法の比較](#5-実装方法の比較)
6. [選択基準とベストプラクティス](#6-選択基準とベストプラクティス)

---

## 1. 概要比較

| 項目 | Deepgram Voice Agent | Vision Agents STS |
|------|---------------------|-------------------|
| **提供元** | Deepgram | GetStream (OSS) |
| **料金** | $4.50/時間（固定） | 使用するモデル次第 |
| **アーキテクチャ** | 統合API（STT+LLM+TTS） | モジュラー/プラグイン方式 |
| **接続方式** | WebSocket直接接続 | WebRTC（Stream Edge経由） |
| **主な用途** | 音声のみ | 音声+ビデオ |
| **デプロイ** | クラウド/VPC/オンプレ | サーバー運用必要 |
| **カスタマイズ性** | LLM/TTS持ち込み可 | 23+プロバイダー対応 |

---

## 2. Deepgram Voice Agent 詳細

### 2.1 アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│           Deepgram Voice Agent API              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Nova-3  │→ │ LLM     │→ │ Aura-2  │         │
│  │ (STT)   │  │(思考)   │  │ (TTS)   │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│       ↑           ↑            ↓               │
│  統合ランタイム（遅延最小化、状態同期）         │
└─────────────────────────────────────────────────┘
         ↑                       ↓
    WebSocket (wss://agent.deepgram.com)
         ↑                       ↓
┌─────────────────────────────────────────────────┐
│              クライアント（ブラウザ）            │
│  ・マイク入力 → PCM 16kHz                       │
│  ・スピーカー出力 ← PCM 24kHz                   │
└─────────────────────────────────────────────────┘
```

### 2.2 特徴

**統合ランタイムの利点:**
- すべてのコンポーネントが共有環境で動作
- パイプライン遅延を削減
- 状態の不一致を防止

**ネイティブ機能:**
- ターンテイキング予測
- バージイン（割り込み）検出
- ストリーミング関数呼び出し
- リアルタイムプロンプト更新

### 2.3 実装例（TypeScript/ブラウザ）

```typescript
// WebSocket接続
const ws = new WebSocket("wss://agent.deepgram.com/v1/agent/converse",
  ["token", API_KEY]);

// 設定送信
ws.send(JSON.stringify({
  type: "Settings",
  audio: {
    input: { encoding: "linear16", sample_rate: 16000 },
    output: { encoding: "linear16", sample_rate: 24000 }
  },
  agent: {
    listen: { model: "nova-3" },
    think: {
      provider: { type: "open_ai" },
      model: "gpt-4o-mini",
      prompt: "You are a helpful assistant..."
    },
    speak: { model: "aura-2-odysseus-en" },
    greeting: "Hello! How can I help you?"
  }
}));

// 音声データ送信
ws.send(audioBuffer);  // PCM Int16

// イベント処理
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // TTS音声データ
    playAudio(event.data);
  } else {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "ConversationText": // 文字起こし
      case "UserStartedSpeaking": // ユーザー発話開始
      case "AgentThinking": // 思考中
      case "AgentStartedSpeaking": // 応答開始
    }
  }
};
```

### 2.4 実装例（Python）

```python
from deepgram import DeepgramClient

client = DeepgramClient(api_key="YOUR_API_KEY")

with client.agent.v1.connect() as agent:
    # 設定
    settings = {
        "audio": {
            "input": {"encoding": "linear16", "sample_rate": 16000}
        },
        "agent": {
            "listen": {"model": "nova-3"},
            "think": {
                "provider": {"type": "open_ai"},
                "model": "gpt-4o-mini"
            },
            "speak": {"model": "aura-2-zeus-en"}
        }
    }
    agent.send_settings(settings)

    # 音声ストリーミング
    for chunk in audio_stream:
        agent.send_media(chunk)

    # イベントハンドリング
    agent.on("ConversationText", handle_transcript)
```

### 2.5 料金詳細

| 項目 | 料金 |
|------|------|
| Voice Agent API | **$4.50/時間** |
| 比較: OpenAI Realtime | 約$18/時間（75%高い） |
| 比較: ElevenLabs | 約$5.92/時間（24%高い） |

**注意点:**
- WebSocket接続時間ベースの課金
- 持ち込みモデル使用時は割引あり

---

## 3. Vision Agents STS 詳細

### 3.1 アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              Vision Agents Framework                 │
│  ┌──────────────────────────────────────────────┐   │
│  │              Agent Core                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐    │   │
│  │  │ Edge    │ │ LLM     │ │ Processors  │    │   │
│  │  │(Stream) │ │(Gemini/ │ │(YOLO等)     │    │   │
│  │  │         │ │ OpenAI) │ │             │    │   │
│  │  └─────────┘ └─────────┘ └─────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  プラグイン: Deepgram | ElevenLabs | Cartesia | ... │
└─────────────────────────────────────────────────────┘
              ↑ WebRTC
┌─────────────────────────────────────────────────────┐
│           Stream Edge Network (グローバル)           │
└─────────────────────────────────────────────────────┘
              ↑ WebRTC
┌─────────────────────────────────────────────────────┐
│              クライアント（ブラウザ）                │
│              Stream Video SDK使用                   │
└─────────────────────────────────────────────────────┘
```

### 3.2 特徴

**ビデオファースト設計:**
- WebRTCによる真のリアルタイム通信
- ビデオストリーミング直接対応
- フレーム処理パイプライン（YOLO等）

**プロバイダー非依存:**
- 23+の統合プロバイダー
- 単一のAgent classで異なるサービスを統合
- トラック管理とレスポンス変換を自動化

**STS対応モデル:**
- OpenAI Realtime
- Gemini Live
- Amazon Nova Sonic

### 3.3 実装例（Python）

```python
from vision_agents.core.agents import Agent
from vision_agents.plugins import gemini, getstream

# Gemini Live使用（STS）
agent = Agent(
    edge=getstream.Edge(),
    llm=gemini.Realtime(
        model="gemini-2.5-flash-native-audio-preview",
        fps=1,  # ビデオなしの場合は低く設定
        config={
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {"voice_name": "Leda"}
                }
            }
        }
    ),
    instructions="You are a helpful English conversation coach..."
)

# 実行
if __name__ == "__main__":
    from vision_agents.core.agents import cli
    cli(agent)
```

### 3.4 ターンベース実装例（STT → LLM → TTS）

```python
from vision_agents.core.agents import Agent
from vision_agents.plugins import deepgram, openai, elevenlabs, getstream

agent = Agent(
    edge=getstream.Edge(),
    stt=deepgram.STT(model="nova-3"),
    llm=openai.LLM(model="gpt-4o"),
    tts=elevenlabs.TTS(voice="Rachel"),
    instructions="..."
)
```

### 3.5 料金（使用モデル次第）

| モデル | 料金目安 |
|--------|----------|
| Gemini Live | 使用量ベース（比較的安価） |
| OpenAI Realtime | 約$18/時間 |
| STT(Deepgram) + TTS(ElevenLabs) | 組み合わせ次第 |

---

## 4. アーキテクチャの違い

### 4.1 設計思想

| 観点 | Deepgram Voice Agent | Vision Agents |
|------|---------------------|---------------|
| **設計** | 音声特化、垂直統合 | ビデオファースト、水平統合 |
| **接続** | クライアント→Deepgram直接 | クライアント→Stream Edge→サーバー |
| **サーバー** | 不要（API直接） | 必要（Pythonバックエンド） |
| **遅延** | 最小化（統合ランタイム） | Edge経由だが低遅延 |

### 4.2 データフロー比較

**Deepgram Voice Agent:**
```
ブラウザ ←WebSocket→ Deepgram Cloud
          (音声双方向)
```

**Vision Agents:**
```
ブラウザ ←WebRTC→ Stream Edge ←→ Pythonサーバー ←→ AI Provider
                                    (Agent)
```

### 4.3 STS vs ターンベース（Chained）

| 観点 | STS | ターンベース |
|------|-----|-------------|
| **レイテンシ** | 200-300ms | 500ms+ |
| **コスト** | 高い（約10x） | 低い |
| **柔軟性** | ベンダーロック | コンポーネント交換可 |
| **音声品質** | 感情・トーン保持 | テキストボトルネック |
| **最適用途** | Webアプリ（16kHz+） | 電話（8kHz PSTN） |

---

## 5. 実装方法の比較

### 5.1 音声のみアプリ: Deepgram Voice Agent推奨

**理由:**
- サーバー不要、クライアントから直接接続
- 料金が予測可能（$4.50/時間固定）
- 統合ランタイムで最小遅延
- VAQI品質ベンチマーク1位

**実装パターン:**
```
[フロントエンド Only]
  ↓
Next.js/React
  ↓
DeepgramVoiceAgentClient (WebSocket)
  ↓
Deepgram Voice Agent API
```

### 5.2 音声+ビデオ/複雑な処理: Vision Agents推奨

**理由:**
- ビデオ処理（物体検知等）が必要
- 複数AIプロバイダーを組み合わせたい
- サーバーサイドでカスタムロジックが必要

**実装パターン:**
```
[フロントエンド]          [バックエンド]
Next.js                   Python (FastAPI)
Stream Video SDK          Vision Agents
     ↓ WebRTC                  ↓
Stream Edge Network  →   Agent (gemini.Realtime)
```

---

## 6. 選択基準とベストプラクティス

### 6.1 Deepgram Voice Agentを選ぶ場合

**最適なケース:**
- 音声のみのアプリケーション
- サーバーレス構成にしたい
- コストを予測可能にしたい
- 最低遅延が必要
- シンプルな実装を優先

**注意点:**
- ビデオ処理は非対応
- Deepgram APIへの依存
- カスタムモデル統合は限定的

### 6.2 Vision Agents STSを選ぶ場合

**最適なケース:**
- 音声+ビデオの統合が必要
- 複数AIプロバイダーを使い分けたい
- YOLO等のビデオ処理を組み込みたい
- OSS/自社サーバー運用を希望
- 高度なカスタマイズが必要

**注意点:**
- Pythonサーバー運用が必要
- 料金が使用モデル次第で変動
- セットアップが複雑

### 6.3 現在のプロジェクトへの推奨

**現状:**
- フロントエンド: Deepgram Voice Agent（WebSocket直接）
- バックエンド: Vision Agents + Gemini（ビジョン処理）

**音声のみアプリの場合:**

```
推奨: Deepgram Voice Agent単独使用

理由:
1. サーバー不要でシンプル
2. $4.50/時間の固定料金
3. 最低遅延（VAQI 1位）
4. 既にフロントエンドに実装済み
```

---

## Sources

### Deepgram
- [Deepgram Voice Agent Documentation](https://developers.deepgram.com/docs/voice-agent)
- [Voice Agent API Product Page](https://deepgram.com/product/voice-agent-api)
- [Voice Agent API Generally Available](https://deepgram.com/learn/voice-agent-api-generally-available)
- [How to Build a Voice AI Agent](https://deepgram.com/learn/how-to-build-a-voice-ai-agent)
- [Python SDK GitHub](https://github.com/deepgram/deepgram-python-sdk)
- [Voice Agent Function Calling](https://github.com/deepgram/voice-agent-function-calling)

### Vision Agents
- [Vision Agents Documentation](https://visionagents.ai/)
- [Vision Agents GitHub](https://github.com/GetStream/Vision-Agents)
- [Announcing Vision Agents](https://getstream.io/blog/vision-agents-by-stream/)
- [Speech-to-Speech Guide](https://visionagents.ai/ai-technologies/speech-to-speech)

### 比較・分析
- [Top 5 Real-Time Speech-to-Speech APIs](https://getstream.io/blog/speech-apis/)
- [Best Voice AI Platforms](https://getstream.io/blog/best-voice-ai-platforms/)
- [Real-Time vs Turn-Based Architecture](https://softcery.com/lab/ai-voice-agents-real-time-vs-turn-based-tts-stt-architecture)
- [STT API Pricing Breakdown 2025](https://deepgram.com/learn/speech-to-text-api-pricing-breakdown-2025)

---

# 付録: Vision Agents OSS を使った STS ベストプラクティス

## 1. STS（Speech-to-Speech）とは

**従来のアーキテクチャ（パイプライン方式）:**
```
音声入力 → STT → テキスト → LLM → テキスト → TTS → 音声出力
```
- 各ステップで遅延が発生
- トーン・感情・話者特性が失われる

**STSアーキテクチャ（統合方式）:**
```
音声入力 → 統合モデル（STT+LLM+TTS内蔵） → 音声出力
```
- 単一モデルで処理、低遅延
- 部分的な文字起こしが可能（完全な文を待たない）
- 自然な会話フローを維持

---

## 2. Vision Agents でサポートされる STS モデル

| モデル | 特徴 | 接続方式 |
|--------|------|----------|
| **OpenAI Realtime** | 低遅延、ツール呼び出し対応 | WebRTC/WebSockets |
| **Gemini Live** | ネイティブオーディオ、多言語対応 | WebSockets |
| **Amazon Nova Sonic** | 非言語音検出、アクセント認識 | AWS Bedrock |
| **Azure GPT Realtime** | マルチモーダル対応 | WebRTC/WebSockets |

---

## 3. 実装のベストプラクティス

### 3.1 モデル選択基準

| 要件 | 推奨モデル |
|------|-----------|
| 最低遅延 | OpenAI Realtime |
| コスト重視 | Gemini Live |
| 多言語対応 | Gemini Live |
| ツール呼び出し必須 | OpenAI Realtime / Azure |
| エンタープライズ | Amazon Nova Sonic |

### 3.2 コード実装例（Gemini Live）

```python
from vision_agents.core.agents import Agent
from vision_agents.plugins import gemini, getstream

agent = Agent(
    edge=getstream.Edge(),
    llm=gemini.Realtime(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        fps=1,  # メモリ最適化
        config={
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {"voice_name": "Leda"}
                }
            }
        }
    ),
    instructions="詳細で簡潔な指示をここに記述"
)
```

### 3.3 プロンプト設計のベストプラクティス

1. **短く会話的に**: 長文回避、自然な対話を促進
2. **特殊文字を避ける**: マークダウンや記号は音声に不向き
3. **フレンドリーなトーン**: ユーザー体験向上
4. **ハルシネーション防止**: 具体的な制約を明示

### 3.4 パフォーマンス最適化

| 設定 | 推奨値 | 理由 |
|------|--------|------|
| FPS | 1-10 | メモリ使用量削減（ビデオ付きの場合） |
| ターン検出 | 内蔵 | STSモデルは自動対応 |
| 割り込み処理 | 有効化 | 自然な会話フローのため |

### 3.5 注意点・制限事項

1. **ビデオAIの制限**:
   - 小さいテキスト読み取りが苦手
   - 長時間動画でコンテキストロス

2. **STSの制限**:
   - ビデオだけでは応答トリガーされない
   - 音声/テキスト入力が必要

3. **推奨アーキテクチャ**:
   - 小型特化モデル（YOLO等）+ API呼び出し + 大型LLM の組み合わせ

---

## 4. STS統合オプション

### オプションA: Gemini Live 統一
```python
# バックエンドで音声+ビジョンを統合
agent = Agent(
    edge=getstream.Edge(),
    llm=gemini.Realtime(fps=1),  # 音声+ビジョン両対応
    instructions=INSTRUCTIONS
)
```
- メリット: シンプル、単一API
- デメリット: Gemini依存

### オプションB: OpenAI Realtime 併用
```python
from vision_agents.plugins import openai

agent = Agent(
    edge=getstream.Edge(),
    llm=openai.Realtime(),  # 低遅延音声
    processors=[...],  # ビジョン処理は別プロセッサ
)
```
- メリット: 最低遅延
- デメリット: コスト高

### オプションC: ハイブリッド（現状維持+最適化）
- フロントエンド: Deepgram Voice Agent（音声）
- バックエンド: Vision Agents + Gemini（ビジョン）
- メリット: 柔軟性、コスト分散
- デメリット: 複雑性
