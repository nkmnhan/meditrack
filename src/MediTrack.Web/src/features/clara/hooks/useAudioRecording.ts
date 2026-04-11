import { useRef, useState } from "react";

interface UseAudioRecordingOptions {
  onAudioChunk: (data: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  /** Interval in ms between audio chunks (default: 1000ms) */
  chunkIntervalMs?: number;
}

interface UseAudioRecordingReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

/**
 * Hook for capturing audio from the user's microphone.
 * Streams audio chunks at regular intervals for real-time transcription.
 */
export function useAudioRecording({
  onAudioChunk,
  onError,
  chunkIntervalMs = 1000,
}: UseAudioRecordingOptions): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // WebM container header is only present in the first chunk. All subsequent
  // chunks must be prefixed with it to form a valid standalone WebM file that
  // Deepgram (and other REST STT APIs) can parse.
  const webmHeaderRef = useRef<ArrayBuffer | null>(null);

  const isSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof MediaRecorder !== "undefined";

  /**
   * Start recording audio from the microphone
   */
  async function startRecording() {
    if (!isSupported) {
      onError?.(new Error("Audio recording is not supported in this browser"));
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for speech recognition
        },
      });

      streamRef.current = stream;
      webmHeaderRef.current = null;

      // Determine supported MIME type
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks and send them
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            const arrayBuffer = await event.data.arrayBuffer();

            if (webmHeaderRef.current === null) {
              // First chunk — contains the WebM EBML header + codec info + first audio frames.
              // Save it so we can prepend it to every subsequent chunk.
              webmHeaderRef.current = arrayBuffer;
              onAudioChunk(arrayBuffer);
            } else {
              // Subsequent chunks — raw audio frames only, no container header.
              // Deepgram REST API rejects these as "corrupt data" without the header.
              // Prepend the saved header to produce a valid standalone WebM file.
              const header = webmHeaderRef.current;
              const combined = new Uint8Array(header.byteLength + arrayBuffer.byteLength);
              combined.set(new Uint8Array(header), 0);
              combined.set(new Uint8Array(arrayBuffer), header.byteLength);
              onAudioChunk(combined.buffer);
            }
          } catch (error) {
            console.error("Failed to process audio chunk:", error);
            onError?.(
              error instanceof Error
                ? error
                : new Error("Failed to process audio")
            );
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        const error = (event as ErrorEvent).error || new Error("MediaRecorder error");
        console.error("MediaRecorder error:", error);
        onError?.(error);
        stopRecording();
      };

      // Start recording with timeslice for chunked data
      mediaRecorder.start(chunkIntervalMs);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to access microphone")
      );
    }
  }

  /**
   * Stop recording and release resources
   */
  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    mediaRecorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  }

  /**
   * Pause recording (keeps microphone stream open)
   */
  function pauseRecording() {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
    }
  }

  /**
   * Resume recording after pause
   */
  function resumeRecording() {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
    }
  }

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

/**
 * Get the best supported MIME type for audio recording
 */
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback - browser will use default
  return "";
}
