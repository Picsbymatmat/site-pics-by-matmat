import type { CategoryKey, CategoryPhotos, PhotoAsset } from "../types";
import { PHOTOS } from "../data/photos";

/**
 * Cloudinary wiring (§11). No account exists yet — Gavin creates it, Matt
 * gets folder upload access. Nothing here ever touches an API secret:
 * Cloudinary's Admin API (needed to *list* a folder's contents) requires
 * Basic Auth with a secret that must never reach the browser, so folder
 * listing is not done client-side against Cloudinary directly.
 *
 * The actual flow:
 * 1. A build-time script (scripts/generate-cloudinary-manifest.mjs, not yet
 *    live — needs real credentials) calls the Admin API server-side using
 *    CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET (plain env vars, never
 *    VITE_-prefixed, so Vite never bundles them into client code) and
 *    writes public/cloudinary-manifest.json.
 * 2. The client fetches that static JSON file. This satisfies "build time"
 *    freshness immediately and "without a redeploy" freshness as soon as
 *    that manifest file is refreshed on a schedule or via a Cloudinary
 *    upload webhook — both Milestone 2 infra, tracked, not yet built.
 * 3. Until an account exists and that manifest is live, every call here
 *    falls back to the local placeholder manifest (src/data/photos.ts) so
 *    components never see a broken state.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const MANIFEST_URL = "/cloudinary-manifest.json";

export interface CloudinaryDeliveryOptions {
  width?: number;
  quality?: "auto";
  format?: "auto";
}

/** Pure, unsigned delivery URL construction — safe to run client-side. */
export function buildDeliveryUrl(publicId: string, opts: CloudinaryDeliveryOptions = {}): string {
  if (!CLOUD_NAME) return publicId; // dev fallback: treat as a plain path
  const { width, quality = "auto", format = "auto" } = opts;
  const transforms = [width ? `w_${width}` : null, `q_${quality}`, `f_${format}`]
    .filter(Boolean)
    .join(",");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}

let manifestCache: Partial<Record<CategoryKey, CategoryPhotos>> | null = null;

async function loadManifest(): Promise<Partial<Record<CategoryKey, CategoryPhotos>>> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
    manifestCache = (await res.json()) as Partial<Record<CategoryKey, CategoryPhotos>>;
    return manifestCache;
  } catch {
    // No manifest yet (no Cloudinary account, or it hasn't been generated).
    // Fall back to placeholders rather than surface an error to a visitor.
    manifestCache = {};
    return manifestCache;
  }
}

/** Category photos for a given key: real Cloudinary manifest if available
 *  and non-empty, otherwise the local placeholder manifest. */
export async function getCategoryPhotos(key: CategoryKey): Promise<CategoryPhotos> {
  const manifest = await loadManifest();
  const real = manifest[key];
  if (real && real.frames.length > 0) return real;
  return PHOTOS[key];
}

/** Fetch every category up front, e.g. for preloading atmosphere plates. */
export async function getAllCategoryPhotos(): Promise<Record<CategoryKey, CategoryPhotos>> {
  const keys: CategoryKey[] = ["product", "brand", "event", "portrait"];
  const entries = await Promise.all(keys.map(async (k) => [k, await getCategoryPhotos(k)] as const));
  return Object.fromEntries(entries) as Record<CategoryKey, CategoryPhotos>;
}

export function isPlaceholder(photo: PhotoAsset | null): photo is null {
  return photo === null;
}
