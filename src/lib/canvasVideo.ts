import { createFile, DataStream, type MP4File, type MP4Sample } from "mp4box";

// Play an H.264 MP4 (no B-frames -> in-order frames) into a <canvas> by decoding
// it frame-by-frame with WebCodecs. There is no <video> element, so Safari's
// muted-autoplay policy never applies: the clip animates on load with no gesture.
//
// Backpressure: we keep only ~1-2 frames in flight (feed one chunk per drawn
// frame) and loop by re-feeding from the first chunk (a keyframe), so memory
// stays flat even with many cards playing at once.

export const WEBCODECS_OK =
  typeof window !== "undefined" &&
  "VideoDecoder" in window &&
  "EncodedVideoChunk" in window;

export interface CanvasVideoHandle {
  stop: () => void;
}

export function playMp4ToCanvas(
  canvas: HTMLCanvasElement,
  url: string,
  opts: { fit?: boolean; fps?: number } = {},
): CanvasVideoHandle {
  // fit: keep the canvas at its current (fixed) size and draw frames scaled into
  // it -- used when the canvas backs a WebGL texture, so its dimensions never
  // change after the texture is created (a resize can leave the texture black).
  const { fit = false, fps = 30 } = opts;
  let stopped = false;
  let decoder: VideoDecoder | null = null;
  let raf = 0;
  let lastDraw = 0;
  let feedIdx = 0;
  let configured = false;
  let primed = false;
  // start from the hint; replaced with the clip's true frame interval once the
  // first sample is parsed (so playback speed + cadence exactly match the file)
  let frameInterval = 1000 / fps;
  const chunks: EncodedVideoChunk[] = [];
  const queue: VideoFrame[] = [];
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingQuality = "high";

  // Track the canvas's rendered box so each frame is COVER-cropped into a
  // box-aspect buffer. object-fit:cover is unreliable on <canvas> -- it
  // letterboxes the clip whenever the card aspect != the video aspect (showed
  // up the moment project cards went 1:1 -> 4:5 and talks 16:9 -> 4:3). Skipped
  // in `fit` mode (a fixed-size canvas backing a WebGL texture).
  let boxW = 0;
  let boxH = 0;
  let ro: ResizeObserver | null = null;
  if (!fit && typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0) {
        boxW = w;
        boxH = h;
      }
    });
    ro.observe(canvas);
  }

  const TARGET_BUFFER = 8;
  const feedNext = () => {
    if (!decoder || stopped || chunks.length === 0) return;
    if (feedIdx >= chunks.length) feedIdx = 0; // loop: chunk[0] is a keyframe
    try {
      decoder.decode(chunks[feedIdx++]);
    } catch {
      /* decoder closed mid-flight */
    }
  };
  // keep the decode pipeline filled regardless of draw rate (feeding only on
  // draw deadlocks: no draw until a frame is out, no frame until it's fed)
  const pump = () => {
    if (!decoder || stopped || chunks.length === 0) return;
    let guard = 0;
    while (queue.length + decoder.decodeQueueSize < TARGET_BUFFER && guard++ < TARGET_BUFFER) {
      feedNext();
    }
  };

  const tick = (now: number) => {
    if (stopped) return;
    if (queue.length && now - lastDraw >= frameInterval) {
      const frame = queue.shift()!;
      if (ctx) {
        if (fit) {
          // fixed-size canvas (backs a WebGL texture): fill it directly
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        } else {
          // size the buffer to the rendered box, then COVER-crop the frame into
          // it (centered) so the clip fills any card aspect without letterboxing
          const tw = boxW || frame.displayWidth;
          const th = boxH || frame.displayHeight;
          if (canvas.width !== tw || canvas.height !== th) {
            canvas.width = tw;
            canvas.height = th;
          }
          const fw = frame.displayWidth;
          const fh = frame.displayHeight;
          const s = Math.max(tw / fw, th / fh);
          ctx.drawImage(
            frame,
            (tw - fw * s) / 2,
            (th - fh * s) / 2,
            fw * s,
            fh * s,
          );
        }
      }
      frame.close();
      // advance on a fixed grid (not "= now") so cadence stays even and doesn't
      // drift against the 60Hz rAF; resync only if we've fallen >1 frame behind
      lastDraw += frameInterval;
      if (now - lastDraw > frameInterval) lastDraw = now;
    }
    pump();
    raf = requestAnimationFrame(tick);
  };

  const onSamples = (_id: number, _user: unknown, samples: MP4Sample[]) => {
    for (const s of samples) {
      // adopt the clip's real frame interval from the first sample
      if (chunks.length === 0 && s.duration > 0) {
        frameInterval = (s.duration / s.timescale) * 1000;
      }
      chunks.push(
        new EncodedVideoChunk({
          type: s.is_sync ? "key" : "delta",
          timestamp: (s.cts * 1e6) / s.timescale,
          duration: (s.duration * 1e6) / s.timescale,
          data: s.data,
        }),
      );
    }
    if (configured && !primed && chunks.length) {
      primed = true;
      pump();
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };

  (async () => {
    let buf: ArrayBuffer;
    try {
      buf = await (await fetch(url)).arrayBuffer();
    } catch {
      return;
    }
    if (stopped) return;
    const file: MP4File = createFile();
    file.onError = () => {};
    file.onSamples = onSamples;
    file.onReady = (info) => {
      const track = info.videoTracks?.[0];
      if (!track) return;
      try {
        decoder = new VideoDecoder({
          output: (frame) => {
            if (stopped || queue.length > 12) {
              frame.close();
              return;
            }
            queue.push(frame);
          },
          error: () => {},
        });
        decoder.configure({
          codec: track.codec,
          codedWidth: track.video.width,
          codedHeight: track.video.height,
          description: avcDescription(file, track.id),
          optimizeForLatency: true,
        });
        configured = true;
      } catch {
        return;
      }
      file.setExtractionOptions(track.id, null, { nbSamples: 1000 });
      file.start();
    };
    const mp4buf = buf as ArrayBuffer & { fileStart: number };
    mp4buf.fileStart = 0;
    file.appendBuffer(mp4buf);
    file.flush();
  })();

  return {
    stop() {
      stopped = true;
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      for (const f of queue) f.close();
      queue.length = 0;
      try {
        decoder?.close();
      } catch {
        /* already closed */
      }
      decoder = null;
    },
  };
}

// Pull the codec config box (avcC/hvcC/etc.) bytes WebCodecs needs to configure.
function avcDescription(file: MP4File, trackId: number): Uint8Array | undefined {
  const trak = (file.getTrackById(trackId) as unknown) as TrakLike;
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC ?? entry.hvcC ?? entry.vpcC ?? entry.av1C;
    if (box) {
      const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      box.write(stream);
      return new Uint8Array(stream.buffer, 8); // strip the 8-byte box header
    }
  }
  return undefined;
}

interface BoxLike {
  write: (s: DataStream) => void;
}
interface TrakLike {
  mdia: {
    minf: {
      stbl: {
        stsd: {
          entries: Array<{
            avcC?: BoxLike;
            hvcC?: BoxLike;
            vpcC?: BoxLike;
            av1C?: BoxLike;
          }>;
        };
      };
    };
  };
}
