// ── Browser: decode ElevenLabs pcm_44100 (s16le mono) and play via Web Audio ──

/** Decode raw little-endian PCM16 mono to -1..1 float samples. */
export function pcm16leToFloat32(pcm: Uint8Array): Float32Array {
  const sampleCount = pcm.length >> 1;
  const out = new Float32Array(sampleCount);
  const view = new DataView(
    pcm.buffer,
    pcm.byteOffset,
    pcm.byteLength
  );
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** Linear interpolation resample (good enough for short honk clips). */
export function linearResample(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate || input.length === 0) return input;
  const ratio = toRate / fromRate;
  const outLen = Math.max(1, Math.round(input.length * ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i / ratio;
    const j = Math.floor(srcPos);
    const f = srcPos - j;
    const a = input[j] ?? 0;
    const b = input[j + 1] ?? a;
    out[i] = a + f * (b - a);
  }
  return out;
}

/** Play mono PCM float buffer; resolves when playback finishes. */
export function playFloat32Pcm(
  ctx: AudioContext,
  channelData: Float32Array,
  sampleRate: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const buffer = ctx.createBuffer(1, channelData.length, sampleRate);
      buffer.copyToChannel(channelData, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => resolve();
      src.start();
    } catch (e) {
      reject(e);
    }
  });
}
