// ARIAPage — Phase 4: ARIA Autonomous Record Intelligence Agent
// Real-time AI clinical consultation powered by Claude (Anthropic via Replit AI Integrations).

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, Send, User, ShieldCheck, ChevronDown, X,
  AlertTriangle, Loader2, RotateCcw, Hash,
} from "lucide-react";
import { type Patient } from "@/lib/patientStore";
import { loadRecords } from "@/lib/recordStore";
import { useAppStore } from "@/store/appStore";

const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const VIOLET = "#A78BFA";
const MINT = "#00FFA3";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ARIAPageProps {
  patients: Patient[];
}

const SUGGESTED_PROMPTS = [
  "Summarise this patient's cardiac history and flag any concerns.",
  "What medications is this patient on and are there any potential interactions?",
  "Is this patient suitable for elective surgery given their history?",
  "Provide a structured handover note for this patient.",
  "What follow-up investigations would you recommend based on the record?",
];

function ARIAOrb({ thinking }: { thinking: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      <motion.div
        animate={{ scale: thinking ? [1, 1.3, 1] : [1, 1.06, 1], opacity: thinking ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3] }}
        transition={{ duration: thinking ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${VIOLET}60 0%, transparent 70%)` }}
      />
      <div className="relative w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "rgba(167,139,250,0.12)", border: `1px solid ${thinking ? "rgba(167,139,250,0.6)" : "rgba(167,139,250,0.25)"}` }}>
        {thinking ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={14} style={{ color: VIOLET }} />
          </motion.div>
        ) : (
          <Brain size={14} style={{ color: VIOLET }} />
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {isUser ? (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,255,163,0.08)", border: "1px solid rgba(0,255,163,0.2)" }}>
          <User size={14} style={{ color: MINT }} />
        </div>
      ) : (
        <ARIAOrb thinking={isStreaming ?? false} />
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={{
          background: isUser ? "rgba(0,255,163,0.06)" : "rgba(167,139,250,0.06)",
          border: `1px solid ${isUser ? "rgba(0,255,163,0.15)" : "rgba(167,139,250,0.15)"}`,
          color: SILVER,
        }}
      >
        {msg.content}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
            style={{ background: VIOLET }}
          />
        )}
      </div>
    </motion.div>
  );
}

export function ARIAPage({ patients }: ARIAPageProps) {
  const { hederaIdentity } = useAppStore();
  const hospitalDid = hederaIdentity?.did ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  function getPatientContext() {
    if (!selectedPatient) return undefined;
    const records = loadRecords(hospitalDid).filter(
      (r) => r.patientDid === selectedPatient.did || r.patientName === selectedPatient.name
    );
    const summaries = records.map(
      (r) => `${r.recordTitle} (uploaded ${new Date(r.createdAt).toLocaleDateString()}) — IPFS CID: ${r.ipfsCid} — HCS TX: ${r.hcsTransactionId}`
    );
    return {
      name: selectedPatient.name,
      did: selectedPatient.did,
      recordSummaries: summaries,
    };
  }

  async function sendMessage(userText: string) {
    if (!userText.trim() || isThinking) return;
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: userText.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsThinking(true);
    setStreamingContent("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/aria/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: updatedMessages,
          patientContext: getPatientContext(),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Network error" }));
        throw new Error((err as { error?: string }).error ?? "Request failed");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
            if (data.error) throw new Error(data.error);
            if (data.done) break;
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
      setStreamingContent("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsThinking(false);
      setStreamingContent("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  }

  function handleReset() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingContent("");
    setIsThinking(false);
    setError(null);
  }

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]" style={{ color: SILVER }}>

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b" style={{ borderColor: GLASS_BORDER }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-lg"
                style={{ background: `${VIOLET}40` }}
              />
              <div className="relative w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.1)", border: "1.5px solid rgba(167,139,250,0.3)" }}>
                <Brain size={18} style={{ color: VIOLET }} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black" style={{ color: SILVER }}>ARIA</h1>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: VIOLET }}>
                  Clinical AI
                </span>
              </div>
              <p className="text-xs" style={{ color: MUTED }}>Autonomous Record Intelligence Agent · Powered by Claude</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Patient selector */}
            <div className="relative">
              <button
                onClick={() => setPatientDropdownOpen(!patientDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: selectedPatient ? "rgba(167,139,250,0.1)" : GLASS_BG,
                  border: `1px solid ${selectedPatient ? "rgba(167,139,250,0.3)" : GLASS_BORDER}`,
                  color: selectedPatient ? VIOLET : MUTED,
                }}
              >
                {selectedPatient ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: MINT }} />
                    {selectedPatient.name}
                  </>
                ) : "Select patient context"}
                <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {patientDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border overflow-hidden"
                    style={{ background: "#0D0F14", borderColor: GLASS_BORDER }}
                  >
                    <button
                      onClick={() => { setSelectedPatient(null); setPatientDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                      style={{ color: MUTED }}
                    >
                      No patient context
                    </button>
                    {patients.map((p) => (
                      <button
                        key={p.did}
                        onClick={() => { setSelectedPatient(p); setPatientDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors border-t"
                        style={{ color: SILVER, borderColor: GLASS_BORDER }}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="font-mono mt-0.5 truncate" style={{ color: MUTED, fontSize: "10px" }}>
                          {p.did.slice(0, 40)}…
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white/5"
                style={{ border: `1px solid ${GLASS_BORDER}`, color: MUTED }}
              >
                <RotateCcw size={11} /> New chat
              </button>
            )}
          </div>
        </div>

        {/* Patient context banner */}
        <AnimatePresence>
          {selectedPatient && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <ShieldCheck size={12} style={{ color: MINT, flexShrink: 0 }} />
                <span style={{ color: MUTED }}>Patient context active:</span>
                <span className="font-bold" style={{ color: SILVER }}>{selectedPatient.name}</span>
                <Hash size={10} style={{ color: MUTED }} />
                <span className="font-mono text-[10px] truncate" style={{ color: MUTED }}>
                  {selectedPatient.did.slice(-24)}
                </span>
                <button onClick={() => setSelectedPatient(null)} className="ml-auto flex-shrink-0 hover:opacity-70">
                  <X size={11} style={{ color: MUTED }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-6 py-8"
          >
            {/* Hero orb */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: `${VIOLET}50` }}
              />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(167,139,250,0.08)", border: "2px solid rgba(167,139,250,0.2)" }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border border-dashed"
                  style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "rgba(167,139,250,0.6)" }}
                />
                <Brain size={28} style={{ color: VIOLET }} />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black mb-2" style={{ color: SILVER }}>Hello, I'm ARIA</h2>
              <p className="text-sm max-w-sm leading-relaxed" style={{ color: MUTED }}>
                I provide clinical intelligence from encrypted patient records — without exposing raw data.
                Select a patient above or ask me a clinical question to get started.
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="w-full max-w-lg space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Suggested questions</p>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-4 py-3 rounded-xl text-xs transition-all hover:border-violet-400/30 hover:bg-violet-400/5"
                  style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: SILVER }}
                >
                  <Sparkles size={10} className="inline mr-2" style={{ color: VIOLET }} />
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>
              <AlertTriangle size={10} />
              Clinical decision-support only — does not replace clinical judgment.
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} isStreaming={false} />
        ))}

        {isThinking && streamingContent && (
          <MessageBubble
            msg={{ role: "assistant", content: streamingContent }}
            isStreaming={true}
          />
        )}

        {isThinking && !streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 items-center"
          >
            <ARIAOrb thinking={true} />
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: VIOLET }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#F87171" }}
            >
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto flex-shrink-0 hover:opacity-70">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 pb-6 pt-3 border-t" style={{ borderColor: GLASS_BORDER }}>
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask ARIA a clinical question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isThinking}
            className="w-full bg-transparent resize-none px-4 pt-3 pb-10 text-sm outline-none placeholder:text-slate-600"
            style={{ color: SILVER, minHeight: "52px", maxHeight: "140px" }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <span className="text-xs" style={{ color: "rgba(100,116,139,0.4)" }}>
              {isThinking ? "ARIA is thinking…" : "Enter ↵"}
            </span>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() && !isThinking ? `linear-gradient(135deg, ${VIOLET}, #7C3AED)` : "rgba(167,139,250,0.1)",
                color: "white",
              }}
            >
              {isThinking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-2" style={{ color: "rgba(100,116,139,0.35)" }}>
          <AlertTriangle size={9} className="inline mr-1" />
          ARIA provides clinical decision-support only. Does not replace clinical judgment.
        </p>
      </div>
    </div>
  );
}
