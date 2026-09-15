import type { CategoryMeta } from "../types";

export const CATEGORIES: CategoryMeta[] = [
  { key: "product", label: "Professional & product", slug: "product" },
  { key: "brand", label: "Brand & lifestyle", slug: "brand" },
  { key: "event", label: "Events", slug: "event" },
  { key: "portrait", label: "Portraits", slug: "portrait" },
];

export const CATEGORY_BY_SLUG: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);
