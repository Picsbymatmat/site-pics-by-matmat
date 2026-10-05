import type { CategoryMeta } from "../types";

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "product",
    label: "Product",
    slug: "product",
    shootTypes: ["Macro & Details", "Food", "Lifestyle Shots"],
  },
  {
    key: "event",
    label: "Event",
    slug: "event",
    shootTypes: ["Proposals / Couples", "Social Events", "Concerts / Performance"],
  },
  {
    key: "brand",
    label: "Brand",
    slug: "brand",
    shootTypes: ["Personal Branding", "Clothing Brand", "Storefront / Location"],
  },
  {
    key: "portrait",
    label: "Portrait",
    slug: "portrait",
    shootTypes: ["Stylized Portraits", "Professional Headshots", "Graduation / Milestone"],
  },
];

export const CATEGORY_BY_SLUG: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);
