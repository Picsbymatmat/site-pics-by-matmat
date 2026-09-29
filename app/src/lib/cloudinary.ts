import type { CategoryKey, CategoryPhotos, PhotoAsset, PhotoManifest } from "../types";
import { PHOTOS } from "../data/photos";

/**
 * Cloudinary wiring (§11, §12).
 *
 * Category photos come from Cloudinary *folders*, no tags needed:
 *   {category}/filmstrip/     landing filmstrip
 *   {category}/row1/ … row3/  category page's three gallery rows
 *   {category}/success/       confirmation photo
 *   {category}/plate/         background plate
 * Listing a folder needs Cloudinary's API secret, so the listing happens
 * server-side in netlify/functions/photos.ts; this just fetches its result.
 * That function only runs under Netlify (or `netlify dev` locally) — under
 * plain `vite dev` it 404s and every category shows the local placeholders.
 *
 * `favicon` and `signature` are still single tags outside any folder, read
 * through Cloudinary's public tag-list endpoint (no secret needed; requires
 * "Resource list" enabled in the account's security settings).
 *
 * A category with nothing uploaded (no filmstrip or gallery photos) falls
 * back to the local placeholder manifest. Once it has any real content,
 * individual empty slots stay empty rather than borrowing a placeholder —
 * components render those as neutral placeholder blocks.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const PHOTOS_ENDPOINT = "/.netlify/functions/photos";

function hasAnyReal(photos: CategoryPhotos): boolean {
  return photos.film.some(Boolean) || photos.rows.some((row) => row.length > 0);
}

let manifestPromise: Promise<PhotoManifest> | null = null;

async function fetchManifest(): Promise<PhotoManifest> {
  try {
    const res = await fetch(PHOTOS_ENDPOINT);
    if (!res.ok) return PHOTOS;
    const body = (await res.json()) as { photos?: Partial<Record<CategoryKey, CategoryPhotos>> };
    const keys = Object.keys(PHOTOS) as CategoryKey[];
    return Object.fromEntries(
      keys.map((key) => {
        const real = body.photos?.[key];
        return [key, real && hasAnyReal(real) ? real : PHOTOS[key]];
      }),
    ) as PhotoManifest;
  } catch {
    return PHOTOS;
  }
}

/** Every category's photos, fetched once per page load: real Cloudinary
 *  folder contents where uploaded, local placeholders otherwise. */
export function getAllCategoryPhotos(): Promise<PhotoManifest> {
  if (!manifestPromise) manifestPromise = fetchManifest();
  return manifestPromise;
}

// ---- Single-image tags outside the category folders (§12, §13) ----

function buildDeliveryUrl(publicId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${publicId}`;
}

interface CloudinaryListResource {
  public_id: string;
  width: number;
  height: number;
  context?: { custom?: { alt?: string } };
}

/** First image carrying `tag`, or null on any failure (no account, tag
 *  listing not enabled, nothing uploaded yet). Sorted by public_id so the
 *  pick is stable if more than one image carries the tag. */
async function fetchFirstTagged(tag: string): Promise<PhotoAsset | null> {
  if (!CLOUD_NAME) return null;
  try {
    const res = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${tag}.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { resources: CloudinaryListResource[] };
    const first = data.resources.slice().sort((a, b) => a.public_id.localeCompare(b.public_id))[0];
    if (!first) return null;
    return {
      src: buildDeliveryUrl(first.public_id),
      alt: first.context?.custom?.alt ?? "",
      w: first.width,
      h: first.height,
    };
  } catch {
    return null;
  }
}

let signaturePromise: Promise<PhotoAsset | null> | null = null;
let faviconPromise: Promise<PhotoAsset | null> | null = null;

/** Matt's signature mark (tag `signature`), or null if unconfigured —
 *  callers fall back to the local placeholder PNG in that case. */
export function getSignature(): Promise<PhotoAsset | null> {
  if (!signaturePromise) signaturePromise = fetchFirstTagged("signature");
  return signaturePromise;
}

/** Site favicon image (tag `favicon`), or null if unconfigured — callers
 *  keep the static /favicon.svg default in that case. */
export function getFavicon(): Promise<PhotoAsset | null> {
  if (!faviconPromise) faviconPromise = fetchFirstTagged("favicon");
  return faviconPromise;
}
