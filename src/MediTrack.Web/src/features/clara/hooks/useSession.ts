import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getOidcAccessToken } from "@/shared/auth/getOidcAccessToken";
import type {
  AgentStatus,
  ConnectionStatus,
  Session,
  TranscriptLine,
  Suggestion,
  PendingTranscriptLine,
} from "../types";

import { CLARA_API_URL } from "../config";
const HUB_URL = `${CLARA_API_URL}/sessionHub`;

interface UseSessionOptions {
  sessionId: string;
  /** Historical transcript lines loaded from the REST API — seeds state on mount so the
   * transcript is visible immediately, before SignalR's SessionUpdated fires. */
  initialTranscriptLines?: readonly TranscriptLine[];
  /** Historical suggestions loaded from the REST API — seeds state on mount. */
  initialSuggestions?: readonly Suggestion[];
  onTranscriptLine?: (line: TranscriptLine) => void;
  onSuggestion?: (suggestion: Suggestion) => void;
  onError?: (error: Error) => void;
}

interface UseSessionReturn {
  connectionStatus: ConnectionStatus;
  session: Session | null;
  transcriptLines: TranscriptLine[];
  /** Interim (non-final) transcript line streaming from Deepgram. Null when idle. */
  pendingLine: PendingTranscriptLine | null;
  suggestions: Suggestion[];
  /** Current AI pipeline stage — drives thinking/loading indicators in the UI. */
  agentStatus: AgentStatus;
  sendAudioChunk: (audioData: ArrayBuffer) => Promise<void>;
}

/**
 * Hook for managing real-time session connection via SignalR.
 * Handles connection lifecycle, audio streaming, and receiving suggestions.
 */
export function useSession({
  sessionId,
  initialTranscriptLines,
  initialSuggestions,
  onTranscriptLine,
  onSuggestion,
  onError,
}: UseSessionOptions): UseSessionReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [session, setSession] = useState<Session | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  // Seed from REST data so the transcript is visible before SignalR connects
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>(
    () => (initialTranscriptLines ? [...initialTranscriptLines] : [])
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    () => (initialSuggestions ? [...initialSuggestions] : [])
  );
  const [pendingLine, setPendingLine] = useState<PendingTranscriptLine | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const sessionIdRef = useRef(sessionId);

  // Keep sessionId ref updated
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Store callbacks in refs to avoid stale closures
  const onTranscriptLineRef = useRef(onTranscriptLine);
  const onSuggestionRef = useRef(onSuggestion);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTranscriptLineRef.current = onTranscriptLine;
    onSuggestionRef.current = onSuggestion;
    onErrorRef.current = onError;
  });

  // Build and manage SignalR connection
  useEffect(() => {
    if (!sessionId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getOidcAccessToken() ?? "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Handle connection state changes
    connection.onreconnecting(() => {
      setConnectionStatus("reconnecting");
    });

    connection.onreconnected(() => {
      setConnectionStatus("connected");
      // Rejoin the session after reconnection
      connection.invoke("JoinSession", sessionIdRef.current).catch((error) => {
        console.error("Failed to rejoin session:", error);
        onErrorRef.current?.(new Error("Failed to rejoin session after reconnection"));
      });
    });

    connection.onclose(() => {
      setConnectionStatus("disconnected");
    });

    // Interim result — update the pending preview (not persisted, replaced by final)
    connection.on("TranscriptInterimUpdated", (interim: PendingTranscriptLine) => {
      setPendingLine(interim);
    });

    // Final result — clear pending preview and append committed line
    connection.on("TranscriptLineAdded", (line: TranscriptLine) => {
      setPendingLine(null);
      setTranscriptLines((prev) => [...prev, line]);
      onTranscriptLineRef.current?.(line);
    });

    // Handle incoming suggestions
    connection.on("SuggestionAdded", (suggestion: Suggestion) => {
      setSuggestions((prev) => [...prev, suggestion]);
      onSuggestionRef.current?.(suggestion);
    });

    // Handle session state updates from server (fires after JoinSession).
    // Use the server's authoritative list as the source of truth, since it
    // may include lines created before this client session (e.g. after a refresh).
    connection.on("SessionUpdated", (updatedSession: Session) => {
      setSession(updatedSession);
      if (updatedSession.transcriptLines?.length) {
        // Merge: server list is authoritative; append any locally-added lines not yet persisted
        setTranscriptLines((prev) => {
          const serverIds = new Set(updatedSession.transcriptLines.map((l) => l.id));
          const localOnly = prev.filter((l) => !serverIds.has(l.id));
          return [...updatedSession.transcriptLines, ...localOnly];
        });
      }
      if (updatedSession.suggestions?.length) {
        setSuggestions((prev) => {
          const serverIds = new Set(updatedSession.suggestions.map((s) => s.id));
          const localOnly = prev.filter((s) => !serverIds.has(s.id));
          return [...updatedSession.suggestions, ...localOnly];
        });
      }
    });

    // Handle errors from server
    connection.on("SessionError", (errorMessage: string) => {
      console.error("Session error:", errorMessage);
      onErrorRef.current?.(new Error(errorMessage));
    });

    connection.on("SttError", (errorMessage: string) => {
      console.error("STT error:", errorMessage);
      onErrorRef.current?.(new Error(`Transcription error: ${errorMessage}`));
    });

    connection.on("TranscriptError", (errorMessage: string) => {
      console.error("Transcript error:", errorMessage);
      onErrorRef.current?.(new Error(`Transcript error: ${errorMessage}`));
    });

    // SessionJoined — server confirmation that this client was added to the session group
    connection.on("SessionJoined", () => {
      // No state change needed — connection.invoke("JoinSession") already sets "connected"
    });

    // Agent pipeline events — drive the thinking/loading indicator in the suggestions panel
    connection.on("AgentThinking", () => setAgentStatus("thinking"));
    connection.on("AgentToolStarted", () => setAgentStatus("tool-running"));
    connection.on("AgentToolCompleted", () => setAgentStatus("thinking"));
    connection.on("AgentTextChunk", () => setAgentStatus("streaming"));
    connection.on("AgentCompleted", () => setAgentStatus("idle"));
    connection.on("AgentFailed", (errorMessage: string) => {
      console.error("Agent failed:", errorMessage);
      setAgentStatus("failed");
      // Auto-clear failed state after 5 s so the panel doesn't stay stuck
      setTimeout(() => setAgentStatus("idle"), 5000);
    });

    // Track whether the effect was cleaned up (React Strict Mode runs effects twice
    // in development — the first cleanup fires while the connection is still negotiating,
    // producing an AbortError. The `cleanedUp` guard suppresses the spurious error and
    // ensures the second attempt proceeds cleanly).
    let cleanedUp = false;

    // Start connection
    const startConnection = async () => {
      try {
        setConnectionStatus("connecting");
        await connection.start();

        // If cleanup ran while we were connecting, close the connection and exit
        if (cleanedUp) {
          connection.stop();
          return;
        }

        setConnectionStatus("connected");

        // Join the session
        await connection.invoke("JoinSession", sessionId);
      } catch (error) {
        // AbortError is expected during React Strict Mode's double-invoke cleanup —
        // the connection is intentionally stopped mid-negotiation on the first pass.
        if (cleanedUp || (error instanceof Error && error.name === "AbortError")) {
          return;
        }
        console.error("Failed to connect to session hub:", error);
        setConnectionStatus("disconnected");
        onErrorRef.current?.(
          error instanceof Error ? error : new Error("Connection failed")
        );
      }
    };

    startConnection();

    // Cleanup on unmount
    return () => {
      cleanedUp = true;
      connection.off("TranscriptInterimUpdated");
      connection.off("TranscriptLineAdded");
      connection.off("SuggestionAdded");
      connection.off("SessionUpdated");
      connection.off("SessionError");
      connection.off("SttError");
      connection.off("TranscriptError");
      connection.off("SessionJoined");
      connection.off("AgentThinking");
      connection.off("AgentToolStarted");
      connection.off("AgentToolCompleted");
      connection.off("AgentTextChunk");
      connection.off("AgentCompleted");
      connection.off("AgentFailed");
      connection.stop();
      connectionRef.current = null;
    };
  }, [sessionId]);

  /**
   * Send audio chunk to the server for transcription.
   * Converts ArrayBuffer to base64 — hub method StreamAudioChunk expects string audioBase64.
   * Uses chunked String.fromCharCode to avoid O(N²) string concatenation on large buffers.
   */
  async function sendAudioChunk(audioData: ArrayBuffer): Promise<void> {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to session hub");
    }

    // Convert ArrayBuffer → base64 string in 32KB chunks to avoid call stack overflow
    const bytes = new Uint8Array(audioData);
    const chunkSize = 0x8000;
    const parts: string[] = [];
    for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
      parts.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
    }
    const base64Audio = btoa(parts.join(""));

    await connection.invoke("StreamAudioChunk", sessionIdRef.current, base64Audio);
  }

  return {
    connectionStatus,
    session,
    transcriptLines,
    pendingLine,
    suggestions,
    agentStatus,
    sendAudioChunk,
  };
}
