import type { CategoryMeta } from "../types";

export const CATEGORIES: CategoryMeta[] = [
  { key: "product", label: "Product", slug: "product" },
  { key: "event", label: "Event", slug: "event" },
  { key: "brand", label: "Brand", slug: "brand" },
  { key: "portrait", label: "Portrait", slug: "portrait" },
];

export const CATEGORY_BY_SLUG: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);
