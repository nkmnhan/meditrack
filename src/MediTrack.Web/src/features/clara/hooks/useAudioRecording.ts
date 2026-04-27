import { useRef, useState } from "react";

interface UseAudioRecordingOptions {
  onAudioChunk: (data: ArrayBuffer) => void;
  onError?: (error: Error) => void;
}

interface UseAudioRecordingReturn {
  readonly isRecording: boolean;
  readonly isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

/**
 * Captures microphone audio as raw PCM16 chunks via AudioWorklet.
 * Emits 100ms chunks (1600 samples at 16kHz) as ArrayBuffer — no container header.
 * Compatible with Deepgram WebSocket streaming (encoding=linear16, sample_rate=16000).
 */
export function useAudioRecording({
  onAudioChunk,
  onError,
}: UseAudioRecordingOptions): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const isPausedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const isSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof AudioContext !== "undefined" &&
    typeof AudioWorkletNode !== "undefined";

  async function startRecording() {
    if (!isSupported) {
      onError?.(new Error("Audio recording is not supported in this browser"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;
      isPausedRef.current = false;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-processor.js");

      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (!isPausedRef.current) {
          onAudioChunk(event.data);
        }
      };

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(workletNode);

      // Connect to a silent gain node to keep the audio graph alive without feedback
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      workletNode.connect(silentGain);
      silentGain.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to access microphone"));
    }
  }

  function stopRecording() {
    workletNodeRef.current?.disconnect();
    workletNodeRef.current?.port.close();
    workletNodeRef.current = null;

    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    setIsRecording(false);
    isPausedRef.current = false;
  }

  function pauseRecording() {
    isPausedRef.current = true;
  }

  function resumeRecording() {
    isPausedRef.current = false;
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
