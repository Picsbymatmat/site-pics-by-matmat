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
 * Tagging scheme, one tag per slot — no shared pool with index math, each
 * slot is Matt's own explicit choice:
 *   {key}-film1/2/3    — landing filmstrip's 3 fixed preview slots (one
 *                         exact photo each, first match wins if a tag
 *                         somehow has more than one).
 *   {key}-shoot1/2/3   — CategoryView's 3 rail rows, each its own
 *                         independent pool (as many photos as tagged).
 *   {key}-background   — atmosphere plate.
 *   {key}-hero         — Polaroid confirmation photo.
 *
 * Until an account exists (or a category has nothing tagged under any of
 * its slots yet), every call here falls back to that local placeholder
 * manifest so components never see a broken or empty state. Once a
 * category has *any* real content tagged, individual still-untagged
 * slots stay genuinely empty/null rather than silently borrowing a local
 * placeholder photo — components already render those as neutral
 * placeholder blocks, never fabricated or borrowed photography.
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
  const [film1, film2, film3, shoot1, shoot2, shoot3, backgroundTag, heroTag] = await Promise.all([
    fetchTag(`${key}-film1`),
    fetchTag(`${key}-film2`),
    fetchTag(`${key}-film3`),
    fetchTag(`${key}-shoot1`),
    fetchTag(`${key}-shoot2`),
    fetchTag(`${key}-shoot3`),
    fetchTag(`${key}-background`),
    fetchTag(`${key}-hero`),
  ]);

  const film: CategoryPhotos["film"] = [film1[0] ?? null, film2[0] ?? null, film3[0] ?? null];
  const rows: CategoryPhotos["rows"] = [shoot1, shoot2, shoot3];
  const hasAnyReal = film.some(Boolean) || rows.some((row) => row.length > 0);
  if (!hasAnyReal) return PHOTOS[key];

  return {
    film,
    rows,
    background: backgroundTag[0] ?? null,
    hero: heroTag[0] ?? null,
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
