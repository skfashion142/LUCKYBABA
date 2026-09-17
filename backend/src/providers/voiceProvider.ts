// Phase 7 — Voice provider adapter.
//
// This module is the ONLY place that talks to the external speech provider.
// It never fabricates a transcript or an audio response: any failure to reach
// the provider, any non-2xx response, or any empty result is surfaced as a
// typed VoiceProviderError so the route layer can return an explicit error
// code instead of a fake success.
//
// The adapter targets an OpenAI-compatible speech contract:
//   POST {AI_BASE_URL}/audio/transcriptions   (multipart, field "file" + "model")
//   POST {AI_BASE_URL}/audio/speech           (json: model, voice, input, response_format)
// If a different provider is used in production, only this file needs to change.

export class VoiceProviderError extends Error {
  code: string;
  status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "VoiceProviderError";
  }
}

export type SttConfig = { baseUrl: string; apiKey: string; model: string };
export type TtsConfig = { baseUrl: string; apiKey: string; model: string; voice?: string; format: string };

function trimBase(url: string): string {
  return url.replace(/\/$/, "");
}

// Missing configuration is never treated as "use a default" — voice is either
// fully configured or the caller must get AI_PROVIDER_NOT_CONFIGURED.
export function getSttConfig(): SttConfig | null {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_STT_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl: trimBase(baseUrl), apiKey, model };
}

export function getTtsConfig(): TtsConfig | null {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_TTS_MODEL;
  const format = process.env.AI_TTS_FORMAT || "mp3";
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl: trimBase(baseUrl), apiKey, model, voice: process.env.AI_TTS_VOICE, format };
}

// A short, credential-free label for audit/db rows — never the API key or full URL.
export function providerLabel(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "configured";
  }
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function extensionForMime(mimeType: string): string {
  const sub = mimeType.split("/")[1]?.split(";")[0]?.trim().toLowerCase();
  if (!sub) return "webm";
  if (sub === "x-m4a") return "m4a";
  if (sub === "mpeg") return "mp3";
  return sub;
}

export async function transcribeAudio(
  cfg: SttConfig,
  audio: Buffer,
  mimeType: string,
  timeoutMs: number
): Promise<string> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mimeType }), `audio.${extensionForMime(mimeType)}`);
    form.append("model", cfg.model);

    let upstream: Response;
    try {
      upstream = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${cfg.apiKey}` },
        body: form,
        signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new VoiceProviderError("VOICE_TIMEOUT", "Speech-to-text provider timed out");
      }
      throw new VoiceProviderError("AI_STT_PROVIDER_ERROR", "Speech-to-text provider unreachable");
    }

    if (!upstream.ok) {
      throw new VoiceProviderError("AI_STT_PROVIDER_ERROR", `STT provider returned ${upstream.status}`, upstream.status);
    }

    const data: any = await upstream.json().catch(() => null);
    const text = data?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new VoiceProviderError("AI_STT_EMPTY_RESPONSE", "STT provider returned no transcript");
    }
    return text.trim();
  } finally {
    cancel();
  }
}

export async function synthesizeSpeech(
  cfg: TtsConfig,
  text: string,
  timeoutMs: number
): Promise<{ audio: Buffer; mimeType: string }> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    let upstream: Response;
    try {
      upstream = await fetch(`${cfg.baseUrl}/audio/speech`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          voice: cfg.voice,
          input: text,
          response_format: cfg.format,
        }),
        signal,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new VoiceProviderError("VOICE_TIMEOUT", "Text-to-speech provider timed out");
      }
      throw new VoiceProviderError("AI_TTS_PROVIDER_ERROR", "Text-to-speech provider unreachable");
    }

    if (!upstream.ok) {
      throw new VoiceProviderError("AI_TTS_PROVIDER_ERROR", `TTS provider returned ${upstream.status}`, upstream.status);
    }

    const declaredLength=Number(upstream.headers.get("content-length")||0);
    const MAX_PROVIDER_AUDIO_BYTES=12*1024*1024;
    if(declaredLength>MAX_PROVIDER_AUDIO_BYTES) throw new VoiceProviderError("AI_TTS_PROVIDER_ERROR","TTS provider response too large");
    const reader=upstream.body?.getReader();
    if(!reader) throw new VoiceProviderError("AI_TTS_EMPTY_RESPONSE","TTS provider returned no body");
    const chunks:Buffer[]=[];
    let total=0;
    while(true){
      const part=await reader.read();
      if(part.done) break;
      total+=part.value.byteLength;
      if(total>MAX_PROVIDER_AUDIO_BYTES){ await reader.cancel(); throw new VoiceProviderError("AI_TTS_PROVIDER_ERROR","TTS provider response too large"); }
      chunks.push(Buffer.from(part.value));
    }
    const audio=Buffer.concat(chunks,total);
    if (!audio.length) {
      throw new VoiceProviderError("AI_TTS_EMPTY_RESPONSE", "TTS provider returned no audio");
    }
    return { audio, mimeType: mimeForFormat(cfg.format) };
  } finally {
    cancel();
  }
}

function mimeForFormat(format: string): string {
  switch (format) {
    case "mp3": return "audio/mpeg";
    case "opus": return "audio/opus";
    case "aac": return "audio/aac";
    case "flac": return "audio/flac";
    case "wav": return "audio/wav";
    case "pcm": return "audio/L16";
    default: return "application/octet-stream";
  }
}
