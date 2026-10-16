// Browser-only: samples evenly spaced JPEG frames from a video file.
// Returns base64 strings (no data-URL prefix).

export async function extractFrames(file: File, count = 8, maxWidth = 640): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await waitForEvent(video, "loadedmetadata");

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Die Videodauer konnte nicht gelesen werden.");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Das Video konnte nicht dekodiert werden. Bitte MP4 verwenden.");
    }

    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas ist nicht verfügbar.");

    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      video.currentTime = (duration * (i + 0.5)) / count;
      await waitForEvent(video, "seeked");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7),
      );
      if (!blob) throw new Error("Frame konnte nicht erzeugt werden.");
      frames.push(await blobToBase64(blob));
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function waitForEvent(video: HTMLVideoElement, event: "loadedmetadata" | "seeked"): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, onOk);
      video.removeEventListener("error", onError);
    };
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Das Video konnte nicht gelesen werden."));
    };
    video.addEventListener(event, onOk, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
