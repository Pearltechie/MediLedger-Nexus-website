// ARIA — Autonomous Record Intelligence Agent
// Streaming Claude endpoint that anchors each AI summary on Hedera HCS as
// cryptographic proof of the consultation.

import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  ensureTopic,
  submitToTopic,
  sha256Hex,
  getHederaCreds,
  ARIA_TOPIC_CACHE,
} from "../lib/hederaClient.js";

const router: IRouter = Router();

const ARIA_SYSTEM_PROMPT = `You are ARIA — Autonomous Record Intelligence Agent — a clinical intelligence layer built into MediLedger Nexus, a blockchain-native Electronic Health Record interoperability platform.

Your purpose is to provide structured, evidence-based clinical intelligence to healthcare professionals reviewing shared patient records. You help clinicians at Hospital A understand a patient's history sourced from Hospital B, without Hospital A ever receiving raw record files.

CAPABILITIES:
- Synthesise patient histories from structured record summaries
- Answer clinical questions about diagnoses, medications, procedures, lab trends
- Identify clinically significant patterns, potential drug interactions, or gaps in care
- Generate structured clinical summaries for consultation handovers
- Reason about differential diagnoses when presented with symptoms and history

SAFETY POSTURE (strict — never deviate):
- Always append a concise disclaimer: "Clinical decision-support only — does not replace clinical judgment."
- Never diagnose a specific patient from a chat message alone; ask for more structured context
- Never recommend specific dosages without referencing established guidelines (BNF, UpToDate)
- Flag when information provided is insufficient for a confident clinical opinion
- Do not speculate about conditions not supported by the provided evidence

RESPONSE FORMAT:
- Use clear section headings (bold) for multi-part responses
- Keep language precise and clinical but accessible to general practitioners
- For drug interactions, cite mechanism briefly
- For abnormal values, compare to reference ranges
- Structure complex answers as: Summary → Detail → Caveat

PLATFORM CONTEXT:
- Patient records are AES-256-GCM encrypted and stored on IPFS; CIDs anchored to Hedera HCS
- Every consultation you assist with is automatically anchored to Hedera HCS as cryptographic proof
- You are operating inside a consent-gated environment — hospitals that share data have explicitly granted access
- This is a Hedera Hashgraph-powered platform built for EasyA × Consensus Miami 2025

When the user provides patient context, begin your responses with a brief acknowledgement of the patient record you are working with.`;

function buildAnthropicClient(): Anthropic {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("Anthropic AI integration not configured. Ensure AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY are set.");
  }
  return new Anthropic({ baseURL, apiKey });
}

type ChatMessage = { role: "user" | "assistant"; content: string };

interface ARIAChatBody {
  messages: ChatMessage[];
  patientContext?: {
    name: string;
    did: string;
    recordSummaries?: string[];
  };
}

// Anchors the ARIA summary on Hedera HCS as proof-of-consultation.
// Returns {hcsTxId, summaryHash, ariaTopic} — or null if Hedera is unavailable.
async function anchorOnHedera(
  summaryText: string,
  patientDid: string | undefined,
  question: string
): Promise<{ hcsTxId: string; summaryHash: string; ariaTopic: string } | null> {
  try {
    const { accountId, privateKeyRaw } = getHederaCreds();

    const ariaTopic = await ensureTopic(accountId, privateKeyRaw, {
      cacheFile: ARIA_TOPIC_CACHE,
      envVar: "VITE_HEDERA_ARIA_TOPIC_ID",
      memo: "MediLedger Nexus — ARIA Summaries Ledger",
      logLabel: "ARIA topic",
    });

    const summaryHash = sha256Hex(summaryText);
    const timestamp = new Date().toISOString();

    const payload = JSON.stringify({
      type: "ARIA_SUMMARY",
      version: "1.0",
      timestamp,
      summaryHash,
      patientDid: patientDid ?? null,
      questionPreview: question.slice(0, 120),
      model: "claude-sonnet-4-6",
      platform: "MediLedger Nexus",
    });

    const hcsTxId = await submitToTopic(accountId, privateKeyRaw, ariaTopic, payload);
    console.log(`[aria] Summary anchored on Hedera: ${hcsTxId} (hash: ${summaryHash.slice(0, 16)}…)`);

    return { hcsTxId, summaryHash, ariaTopic };
  } catch (err) {
    console.warn("[aria] Hedera anchoring failed (non-fatal):", err instanceof Error ? err.message : err);
    return null;
  }
}

// POST /aria/chat
// Streams Claude response as SSE. After the stream completes, anchors the
// summary on the ARIA Hedera topic and emits {done, hcsTxId, summaryHash, ariaTopic}.
router.post("/aria/chat", async (req: Request, res: Response) => {
  const body = req.body as ARIAChatBody;

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const validMessages = body.messages.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  );

  if (validMessages.length === 0) {
    res.status(400).json({ error: "No valid messages provided" });
    return;
  }

  // Build system prompt with optional patient context injection
  let systemPrompt = ARIA_SYSTEM_PROMPT;
  if (body.patientContext) {
    const { name, did, recordSummaries } = body.patientContext;
    systemPrompt += `\n\n--- ACTIVE PATIENT CONTEXT ---\nPatient: ${name}\nDID: ${did}`;
    if (recordSummaries && recordSummaries.length > 0) {
      systemPrompt += `\n\nAvailable record summaries:\n${recordSummaries.map((s, i) => `[Record ${i + 1}] ${s}`).join("\n")}`;
    }
    systemPrompt += "\n--- END PATIENT CONTEXT ---";
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const anthropic = buildAnthropicClient();

    // Extract the last user question for the HCS anchor preview
    const lastUserMsg = [...validMessages].reverse().find((m) => m.role === "user");
    const question = lastUserMsg?.content ?? "";

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: validMessages,
    });

    let fullResponse = "";

    // Stream tokens to client
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    // Signal to client that streaming is done and anchoring has started
    res.write(`data: ${JSON.stringify({ anchoring: true })}\n\n`);

    // Anchor the completed summary on Hedera HCS
    const proof = await anchorOnHedera(fullResponse, body.patientContext?.did, question);

    // Final SSE event — includes Hedera proof if available
    res.write(`data: ${JSON.stringify({
      done: true,
      ...(proof && {
        hcsTxId: proof.hcsTxId,
        summaryHash: proof.summaryHash,
        ariaTopic: proof.ariaTopic,
      }),
    })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[aria] Chat error:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export default router;
