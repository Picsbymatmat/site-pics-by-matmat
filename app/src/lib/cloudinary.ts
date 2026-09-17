import type { CategoryKey, CategoryPhotos, PhotoAsset } from "../types";
import { PHOTOS } from "../data/photos";

/**
 * Cloudinary wiring (§11, §12). Uses the public, unsigned tag-list endpoint
 * — `res.cloudinary.com/{cloud}/image/list/{tag}.json` — so no API secret
 * ever needs to exist anywhere, client or build. Requires "Resource list"
 * enabled in Cloudinary's security settings for the account, which makes
 * that endpoint public for any tag (acceptable: it lists derived delivery
 * URLs, not account internals).
 *
 * Tagging scheme: each category's gallery frames are tagged with the
 * category key (`product`, `brand`, `event`, `portrait`); each category's
 * atmosphere plate is tagged `{key}-plate`. The hero photo reuses the
 * first frame, matching the placeholder manifest (src/data/photos.ts).
 *
 * Until an account exists (or a tag has nothing uploaded yet), every call
 * here falls back to that local placeholder manifest so components never
 * see a broken or empty state.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

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

interface CloudinaryListResource {
  public_id: string;
  width: number;
  height: number;
  context?: { custom?: { alt?: string } };
}

interface CloudinaryListResponse {
  resources: CloudinaryListResource[];
}

/** Fetches one tag's resources, sorted by public_id so Matt controls order
 *  by filename prefix (`01-`, `02-`, per §12). Empty on any failure —
 *  no account, tag not enabled for listing, or nothing uploaded yet. */
async function fetchTag(tag: string): Promise<PhotoAsset[]> {
  if (!CLOUD_NAME) return [];
  try {
    const res = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as CloudinaryListResponse;
    return data.resources
      .slice()
      .sort((a, b) => a.public_id.localeCompare(b.public_id))
      .map((r) => ({
        src: buildDeliveryUrl(r.public_id),
        alt: r.context?.custom?.alt ?? "",
        w: r.width,
        h: r.height,
      }));
  } catch {
    return [];
  }
}

const categoryCache = new Map<CategoryKey, Promise<CategoryPhotos>>();

async function fetchCategoryPhotos(key: CategoryKey): Promise<CategoryPhotos> {
  const [frames, plateFrames] = await Promise.all([fetchTag(key), fetchTag(`${key}-plate`)]);
  if (frames.length === 0) return PHOTOS[key];
  return {
    frames,
    plate: plateFrames[0] ?? PHOTOS[key].plate,
    hero: frames[0],
  };
}

/** Category photos for a given key: real Cloudinary tags if the account
 *  has anything uploaded under them, otherwise the local placeholder
 *  manifest. */
export function getCategoryPhotos(key: CategoryKey): Promise<CategoryPhotos> {
  let cached = categoryCache.get(key);
  if (!cached) {
    cached = fetchCategoryPhotos(key);
    categoryCache.set(key, cached);
  }
  return cached;
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
