// Minimal ambient types for the classic mp4box (0.5.x) API surface we use.
declare module "mp4box" {
  export interface MP4Sample {
    is_sync: boolean;
    cts: number;
    duration: number;
    timescale: number;
    data: ArrayBuffer;
  }
  export interface MP4VideoTrack {
    id: number;
    codec: string;
    video: { width: number; height: number };
  }
  export interface MP4Info {
    videoTracks?: MP4VideoTrack[];
  }
  export interface MP4File {
    onReady: (info: MP4Info) => void;
    onError: (e: unknown) => void;
    onSamples: (id: number, user: unknown, samples: MP4Sample[]) => void;
    appendBuffer: (buf: ArrayBuffer & { fileStart: number }) => number;
    start: () => void;
    flush: () => void;
    stop: () => void;
    setExtractionOptions: (
      id: number,
      user: unknown,
      opts: { nbSamples?: number },
    ) => void;
    // returns a parsed trak box; we walk it for the avcC config box
    getTrackById: (id: number) => unknown;
  }
  export function createFile(): MP4File;
  export class DataStream {
    static BIG_ENDIAN: boolean;
    static LITTLE_ENDIAN: boolean;
    constructor(buffer?: ArrayBuffer, byteOffset?: number, endianness?: boolean);
    buffer: ArrayBuffer;
  }
}
