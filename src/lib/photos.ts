import { createClient } from "@/lib/supabase/client";

export const MAX_PHOTOS = 5;

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.8;
const PHOTO_BUCKET = "session-photos";

// Phone photos are routinely 4-10MB; downscale + re-encode so uploads stay
// quick on mobile data and well under the bucket's 5MB per-file cap.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image."))), "image/jpeg", JPEG_QUALITY);
  });
}

// Uploads to `<userId>/<sessionId>/<random>.jpg` (the path shape the Storage
// RLS policies expect) and returns the object paths.
export async function uploadSessionPhotos(sessionId: string, files: File[]): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const paths: string[] = [];
  for (const file of files) {
    const blob = await compressImage(file);
    const path = `${user.id}/${sessionId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}
