import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getOidcAccessToken } from "@/shared/auth/getOidcAccessToken";
import type {
  ConnectionStatus,
  Session,
  TranscriptLine,
  Suggestion,
} from "../types";

const EMERGEN_API_URL =
  import.meta.env.VITE_EMERGEN_API_URL || "https://localhost:5005";
const HUB_URL = `${EMERGEN_API_URL}/sessionHub`;

interface UseSessionOptions {
  sessionId: string;
  onTranscriptLine?: (line: TranscriptLine) => void;
  onSuggestion?: (suggestion: Suggestion) => void;
  onError?: (error: Error) => void;
}

interface UseSessionReturn {
  connectionStatus: ConnectionStatus;
  session: Session | null;
  transcriptLines: TranscriptLine[];
  suggestions: Suggestion[];
  sendAudioChunk: (audioData: ArrayBuffer) => Promise<void>;
  requestSuggestions: () => Promise<void>;
  endSession: () => Promise<void>;
}

/**
 * Hook for managing real-time session connection via SignalR.
 * Handles connection lifecycle, audio streaming, and receiving suggestions.
 */
export function useSession({
  sessionId,
  onTranscriptLine,
  onSuggestion,
  onError,
}: UseSessionOptions): UseSessionReturn {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [session, setSession] = useState<Session | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const sessionIdRef = useRef(sessionId);

  // Keep sessionId ref updated
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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
        onError?.(new Error("Failed to rejoin session after reconnection"));
      });
    });

    connection.onclose(() => {
      setConnectionStatus("disconnected");
    });

    // Handle incoming transcript lines
    connection.on("TranscriptLineReceived", (line: TranscriptLine) => {
      setTranscriptLines((prev) => [...prev, line]);
      onTranscriptLine?.(line);
    });

    // Handle incoming suggestions
    connection.on("SuggestionReceived", (suggestion: Suggestion) => {
      setSuggestions((prev) => [...prev, suggestion]);
      onSuggestion?.(suggestion);
    });

    // Handle session state updates
    connection.on("SessionUpdated", (updatedSession: Session) => {
      setSession(updatedSession);
    });

    // Handle errors from server
    connection.on("Error", (errorMessage: string) => {
      console.error("Session error:", errorMessage);
      onError?.(new Error(errorMessage));
    });

    // Start connection
    const startConnection = async () => {
      try {
        setConnectionStatus("connecting");
        await connection.start();
        setConnectionStatus("connected");

        // Join the session
        await connection.invoke("JoinSession", sessionId);
      } catch (error) {
        console.error("Failed to connect to session hub:", error);
        setConnectionStatus("disconnected");
        onError?.(
          error instanceof Error ? error : new Error("Connection failed")
        );
      }
    };

    startConnection();

    // Cleanup on unmount
    return () => {
      connection.off("TranscriptLineReceived");
      connection.off("SuggestionReceived");
      connection.off("SessionUpdated");
      connection.off("Error");
      connection.stop();
      connectionRef.current = null;
    };
  }, [sessionId, onTranscriptLine, onSuggestion, onError]);

  /**
   * Send audio chunk to the server for transcription
   */
  const sendAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to session hub");
    }

    await connection.invoke("SendAudioChunk", sessionIdRef.current, audioData);
  }, []);

  /**
   * Request AI suggestions for the current conversation
   */
  const requestSuggestions = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to session hub");
    }

    await connection.invoke("RequestSuggestions", sessionIdRef.current);
  }, []);

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Not connected to session hub");
    }

    await connection.invoke("EndSession", sessionIdRef.current);
  }, []);

  return {
    connectionStatus,
    session,
    transcriptLines,
    suggestions,
    sendAudioChunk,
    requestSuggestions,
    endSession,
  };
}
