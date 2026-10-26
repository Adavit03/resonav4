// Decode a song in the browser and cut it into small mono 16 kHz WAV chunks for transcription.

export interface AudioChunk {
  start: number;
  end: number;
  blob: Blob;
  silent: boolean;
}

function encodeWav(samples: Float32Array, rate: number) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

export async function chunkSong(src: string, seconds = 15): Promise<{ chunks: AudioChunk[]; duration: number }> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Could not read this song for transcription.");
  const bytes = await res.arrayBuffer();
  const decodeCtx = new OfflineAudioContext(1, 1, 44100);
  const decoded = await decodeCtx.decodeAudioData(bytes);
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src2 = off.createBufferSource();
  src2.buffer = decoded;
  // Emphasise the vocal band a little before sending
  const hp = off.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 120;
  const pk = off.createBiquadFilter();
  pk.type = "peaking";
  pk.frequency.value = 2500;
  pk.gain.value = 4;
  src2.connect(hp).connect(pk).connect(off.destination);
  src2.start();
  const mono = (await off.startRendering()).getChannelData(0);
  const per = seconds * rate;
  const chunks: AudioChunk[] = [];
  for (let i = 0; i < mono.length; i += per) {
    const slice = mono.subarray(i, Math.min(mono.length, i + per));
    let sum = 0;
    for (let j = 0; j < slice.length; j += 8) sum += slice[j] * slice[j];
    const rms = Math.sqrt(sum / (slice.length / 8));
    chunks.push({ start: i / rate, end: (i + slice.length) / rate, blob: encodeWav(slice, rate), silent: rms < 0.01 });
  }
  return { chunks, duration: decoded.duration };
}
