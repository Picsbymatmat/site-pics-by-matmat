// Photo manifest — §11. Lists Matt's Cloudinary *folders* (no tags needed)
// and returns every category's photos in one response. Listing a folder
// requires Cloudinary's Admin API, which needs the API secret, so this has
// to run server-side; the secret never reaches the browser.
//
// GET /.netlify/functions/photos
//
// Folder layout Matt uploads into (filename order = display order, so a
// `01-`, `02-` prefix controls sequence):
//   {category}/row1/ … row3/  the category page's three gallery rows; the
//                             first photo of each is also that category's
//                             landing filmstrip frame 1 … 3
//   {category}/background/    background plate, first one
// where {category} is product, brand, event or portrait. `favicon`,
// `signature` and `polaroid` stay as tags outside any folder (see
// src/lib/cloudinary.ts).
//
// Response: { photos: Record<CategoryKey, CategoryPhotos> }

import { CATEGORY_KEYS, json } from "./lib/calcom";
import type { CategoryKey } from "./lib/calcom";

const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

interface PhotoAsset {
  src: string;
  alt: string;
  w: number;
  h: number;
}

interface CategoryPhotos {
  film: [PhotoAsset | null, PhotoAsset | null, PhotoAsset | null];
  rows: [PhotoAsset[], PhotoAsset[], PhotoAsset[]];
  background: PhotoAsset | null;
}

interface AdminResource {
  public_id: string;
  resource_type?: string;
  version?: number;
  width: number;
  height: number;
  display_name?: string;
  context?: { custom?: { alt?: string } };
}

interface AdminListResponse {
  resources?: AdminResource[];
  next_cursor?: string;
}

function adminHeaders(): HeadersInit {
  return { Authorization: `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")}` };
}

async function listAll(url: (cursor?: string) => string): Promise<AdminResource[] | null> {
  const out: AdminResource[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(url(cursor), { headers: adminHeaders() });
    if (!res.ok) return null;
    const body = (await res.json()) as AdminListResponse;
    out.push(...(body.resources ?? []));
    cursor = body.next_cursor;
  } while (cursor);
  return out;
}

// Cloudinary accounts use either dynamic folders (the default for accounts
// created since 2024: folder is separate from public_id) or legacy fixed
// folders (folder is the public_id's path). Try the dynamic-folder listing
// first; if the account doesn't support it or it finds nothing, list by
// public_id prefix and keep only files directly in this folder, not its
// subfolders.
async function listFolder(folder: string): Promise<AdminResource[]> {
  const base = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

  const dynamic = await listAll((cursor) => {
    const p = new URLSearchParams({ asset_folder: folder, max_results: "500", context: "true" });
    if (cursor) p.set("next_cursor", cursor);
    return `${base}/resources/by_asset_folder?${p.toString()}`;
  });
  const dynamicImages = dynamic?.filter((r) => (r.resource_type ?? "image") === "image") ?? [];
  if (dynamicImages.length > 0) return dynamicImages;

  const fixed = await listAll((cursor) => {
    const p = new URLSearchParams({ prefix: `${folder}/`, max_results: "500", context: "true" });
    if (cursor) p.set("next_cursor", cursor);
    return `${base}/resources/image/upload?${p.toString()}`;
  });
  return (fixed ?? []).filter((r) => r.public_id.slice(0, r.public_id.lastIndexOf("/")) === folder);
}

function fileName(r: AdminResource): string {
  return r.display_name ?? r.public_id.slice(r.public_id.lastIndexOf("/") + 1);
}

function toAsset(r: AdminResource): PhotoAsset {
  const version = r.version ? `v${r.version}/` : "";
  return {
    src: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto/${version}${r.public_id}`,
    alt: r.context?.custom?.alt ?? "",
    w: r.width,
    h: r.height,
  };
}

async function listSorted(folder: string): Promise<PhotoAsset[]> {
  const resources = await listFolder(folder);
  return resources
    .slice()
    .sort((a, b) => fileName(a).localeCompare(fileName(b), undefined, { numeric: true }))
    .map(toAsset);
}

async function categoryPhotos(key: CategoryKey): Promise<CategoryPhotos> {
  const [row1, row2, row3, background] = await Promise.all([
    listSorted(`${key}/row1`),
    listSorted(`${key}/row2`),
    listSorted(`${key}/row3`),
    listSorted(`${key}/background`),
  ]);
  return {
    film: [row1[0] ?? null, row2[0] ?? null, row3[0] ?? null],
    rows: [row1, row2, row3],
    background: background[0] ?? null,
  };
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return json({ error: "Photos not connected yet" }, 503);
  }

  try {
    const entries = await Promise.all(
      CATEGORY_KEYS.map(async (key) => [key, await categoryPhotos(key)] as const),
    );
    return new Response(JSON.stringify({ photos: Object.fromEntries(entries) }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Browsers always revalidate; Netlify's CDN serves a cached copy
        // for 5 minutes (so new uploads appear within about 5 minutes) and
        // refreshes in the background. Keeps Cloudinary Admin API calls —
        // ~16 per refresh, rate-limited per hour — far below the limit.
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Netlify-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400, durable",
      },
    });
  } catch {
    return json({ error: "Could not load photos" }, 502);
  }
};
