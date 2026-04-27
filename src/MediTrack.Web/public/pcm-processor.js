/**
 * AudioWorklet processor: converts Float32 PCM -> Int16 PCM.
 * Posts 100ms ArrayBuffer chunks to the main thread.
 * Loaded via AudioContext.audioWorklet.addModule('/pcm-processor.js').
 */
class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // sampleRate is a global inside AudioWorkletGlobalScope
    this._samplesPerChunk = Math.floor(sampleRate * 0.1); // 100ms
    this._buffer = new Float32Array(this._samplesPerChunk * 2);
    this._bufferLength = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    let offset = 0;

    while (offset < channel.length) {
      const remaining = this._samplesPerChunk - this._bufferLength;
      const toCopy = Math.min(remaining, channel.length - offset);

      this._buffer.set(channel.subarray(offset, offset + toCopy), this._bufferLength);
      this._bufferLength += toCopy;
      offset += toCopy;

      if (this._bufferLength >= this._samplesPerChunk) {
        const pcm16 = new Int16Array(this._samplesPerChunk);
        for (let i = 0; i < this._samplesPerChunk; i++) {
          const clamped = Math.max(-1, Math.min(1, this._buffer[i]));
          pcm16[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
        }
        // Transfer ownership to avoid copying
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        this._bufferLength = 0;
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PcmProcessor);
