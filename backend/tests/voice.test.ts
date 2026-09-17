// Phase 7 automated tests.
//
// These are written against vitest + supertest and mock both `pg` (no real
// database) and global fetch (no real STT/TTS provider). They verify request
// handling, error-code contracts, ownership isolation, and log hygiene.
//
// NOTE: this suite has been authored but NOT executed in the environment that
// produced it (no network / no `npm install` available there). Run
// `npm install && npm test` before relying on a green result.

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "test-secret-do-not-use-in-prod";

// ---- Mock `pg` before the server module (which constructs a Pool at import
// time) is ever imported. ----
const queryMock = vi.fn(async (sql: string, params: any[] = []) => {
  const s = sql.toLowerCase();

  if (s.includes("insert into audit_logs")) return { rows: [], rowCount: 1 };

  if (s.includes("insert into voice_sessions")) {
    return { rows: [{ id: "voice-session-1", created_at: new Date().toISOString() }], rowCount: 1 };
  }

  if (s.includes("select id,mode,provider,model,mime_type,duration_ms,created_at from voice_sessions")) {
    const [sessionId, customerId] = params;
    // Simulate a real ownership-scoped WHERE clause: only "voice-session-owned"
    // belonging to "customer-a" ever matches.
    if (sessionId === "voice-session-owned" && customerId === "customer-a") {
      return { rows: [{ id: sessionId, mode: "STT", provider: "test.local", model: "test-stt", mime_type: "audio/webm", duration_ms: null, created_at: new Date().toISOString() }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // Fallback for any other query issued during module init.
  return { rows: [], rowCount: 0 };
});

vi.mock("pg", () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: queryMock,
      on: vi.fn(),
    })),
  };
});

let app: import("express").Express;

function customerToken(sub: string) {
  return jwt.sign({ sub, role: "CUSTOMER", jti: "t-" + sub }, JWT_SECRET);
}

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.DATABASE_URL = "postgresql://localhost:5432/testdb";
  process.env.API_PORT = "0";
  process.env.AUTHORIZED_ADMIN_GMAIL = "admin@example.com";
  process.env.AI_BASE_URL = "https://voice-provider.test";
  process.env.AI_API_KEY = "sk-super-secret-value-12345";
  process.env.AI_MODEL = "chat-model";
  process.env.AI_STT_MODEL = "stt-model";
  process.env.AI_TTS_MODEL = "tts-model";
  process.env.AI_TTS_VOICE = "sprout";
  process.env.AI_TTS_FORMAT = "mp3";

  const mod = await import("../src/server");
  app = mod.app as any;
});

beforeEach(() => {
  queryMock.mockClear();
});

const SMALL_WEBM_BASE64 = Buffer.from("fake-audio-bytes").toString("base64");

describe("POST /v1/customer/voice/transcribe", () => {
  it("1. authenticated customer can transcribe voice", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ text: "hello there" }),
    } as any);

    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe("hello there");
    fetchSpy.mockRestore();
  });

  it("2. unauthenticated request is rejected", async () => {
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHENTICATED");
  });

  it("4. empty audio is rejected", async () => {
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: "", mimeType: "audio/webm" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("AUDIO_SIZE_INVALID");
  });

  it("5. audio over 12 MB is rejected", async () => {
    const big = Buffer.alloc(12 * 1024 * 1024 + 10, 1).toString("base64");
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: big, mimeType: "audio/webm" });
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("AUDIO_SIZE_INVALID");
  });

  it("6. missing provider credentials returns configuration error", async () => {
    const prev = process.env.AI_STT_MODEL;
    delete process.env.AI_STT_MODEL;
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("AI_PROVIDER_NOT_CONFIGURED");
    process.env.AI_STT_MODEL = prev;
  });

  it("7. provider failure returns explicit error", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any);
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("AI_STT_PROVIDER_ERROR");
    fetchSpy.mockRestore();
  });

  it("8. successful STT stores a voice session", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ text: "store me" }),
    } as any);
    await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });
    const insertCall = queryMock.mock.calls.find(([sql]) => sql.toLowerCase().includes("insert into voice_sessions"));
    expect(insertCall).toBeTruthy();
    expect(insertCall![1]).toEqual(expect.arrayContaining(["customer-a"]));
    fetchSpy.mockRestore();
  });

  it("rejects an unsupported audio format", async () => {
    const res = await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "video/mp4" });
    expect(res.status).toBe(415);
    expect(res.body.error).toBe("AUDIO_FORMAT_UNSUPPORTED");
  });

  it("10. API key never appears in logs", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockRejectedValueOnce(new Error("network down"));
    await request(app)
      .post("/v1/customer/voice/transcribe")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ audioBase64: SMALL_WEBM_BASE64, mimeType: "audio/webm" });
    const loggedText = logSpy.mock.calls.map((c) => JSON.stringify(c)).join("\n");
    expect(loggedText).not.toContain(process.env.AI_API_KEY);
    logSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});

describe("POST /v1/customer/voice/synthesize", () => {
  it("9. successful TTS stores a voice session", async () => {
    const fetchSpy = vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => Buffer.from("fake-mp3-bytes").buffer,
    } as any);
    const res = await request(app)
      .post("/v1/customer/voice/synthesize")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ text: "Your order is confirmed." });
    expect(res.status).toBe(200);
    expect(res.body.mimeType).toBe("audio/mpeg");
    expect(typeof res.body.audioBase64).toBe("string");
    const insertCall = queryMock.mock.calls.find(([sql]) => sql.toLowerCase().includes("insert into voice_sessions"));
    expect(insertCall).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it("missing TTS provider credentials returns configuration error", async () => {
    const prev = process.env.AI_TTS_MODEL;
    delete process.env.AI_TTS_MODEL;
    const res = await request(app)
      .post("/v1/customer/voice/synthesize")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`)
      .send({ text: "hello" });
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("AI_PROVIDER_NOT_CONFIGURED");
    process.env.AI_TTS_MODEL = prev;
  });
});

describe("GET /v1/customer/voice/sessions/:id (ownership)", () => {
  it("3. customer cannot access another customer's voice session", async () => {
    const res = await request(app)
      .get("/v1/customer/voice/sessions/voice-session-owned")
      .set("Authorization", `Bearer ${customerToken("customer-b")}`);
    expect(res.status).toBe(404);
  });

  it("owner can read their own voice session", async () => {
    const res = await request(app)
      .get("/v1/customer/voice/sessions/voice-session-owned")
      .set("Authorization", `Bearer ${customerToken("customer-a")}`);
    expect(res.status).toBe(200);
    expect(res.body.voiceSession.id).toBe("voice-session-owned");
  });
});

describe("Phase 1-6 regression smoke", () => {
  it("13/14/15. products listing (no auth) still works", async () => {
    const res = await request(app).get("/v1/products");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("products");
  });

  it("health endpoint still responds", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);
  });
});
