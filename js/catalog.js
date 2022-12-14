// The catalog "engine": which products to show for the current query.
// Pure functions only (products and a query in, products out), tested in
// tests/catalog.test.js.
//
// A query looks like this (Step 8 adds sorting, Step 9 the page):
// {
//   search: "wireless",
//   categories: ["electronics"],  empty = all categories
//   minPrice: 20, maxPrice: 100,  whole dollars, or null for no limit
//   minRating: 4,                 0 = any rating
//   inStock: true,                only things you can buy now
//   onSale: false,                only discounted things
// }
import { finalPriceCents } from "./format.js";

// "Lumière Perfume" -> "lumiere perfume"
// Lower case, and accents removed, so "lumiere" finds "Lumière".
// normalize("NFD") splits "è" into "e" + a separate accent mark, and the
// regex then removes the accent marks (Unicode range 0300–036F).
export function simplify(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Everything a search can match for one product, in one string
function searchableText(product, categoryNames) {
  return simplify(
    [
      product.name,
      product.brand,
      categoryNames[product.category] ?? product.category,
      ...product.tags,
    ].join(" ")
  );
}

// ===== One rule per filter =====
// Every word you type has to appear somewhere: "wireless audio" finds
// products that are wireless AND audio, in any order.
export function matchesSearch(product, query, categoryNames = {}) {
  const words = simplify(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true; // no search: everything matches
  const text = searchableText(product, categoryNames);
  return words.every((word) => text.includes(word));
}

// Ticked categories: show products in ANY of them ("Shoes or Clothing").
// None ticked means every category.
export function matchesCategories(product, categories) {
  return categories.length === 0 || categories.includes(product.category);
}

// Prices are compared with what you'd actually PAY (after any discount),
// in cents. min and max are whole dollars, or null for "no limit".
export function matchesPrice(product, minPrice, maxPrice) {
  const price = finalPriceCents(product);
  if (minPrice !== null && price < minPrice * 100) return false;
  if (maxPrice !== null && price > maxPrice * 100) return false;
  return true;
}

export function matchesRating(product, minRating) {
  return product.rating >= minRating;
}

export function matchesAvailability(product, { inStock, onSale }) {
  if (inStock && product.stock === 0) return false;
  if (onSale && product.discountPercent === 0) return false;
  return true;
}

// All the rules, each written the same way: (product, query, names) -> true/false.
// Adding a filter means adding one line here.
const RULES = [
  (product, query, names) => matchesSearch(product, query.search, names),
  (product, query) => matchesCategories(product, query.categories),
  (product, query) => matchesPrice(product, query.minPrice, query.maxPrice),
  (product, query) => matchesRating(product, query.minRating),
  (product, query) => matchesAvailability(product, query),
];

// The products to show for a query. A product has to pass EVERY rule.
export function getResults(products, query, categoryNames = {}) {
  return products.filter((product) =>
    RULES.every((rule) => rule(product, query, categoryNames))
  );
}

// How many products each category WOULD show, given everything else you've
// chosen. That's why the category filter itself is left out: ticking
// "Shoes" shouldn't make "Clothing" show 0.
//   -> { electronics: 3, clothing: 0, ... }
export function countByCategory(products, query, categoryNames = {}) {
  const counts = {};
  for (const product of getResults(products, { ...query, categories: [] }, categoryNames)) {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
  }
  return counts;
}

// ===== Cleaning what was typed =====
// Text from a price box -> whole dollars, or null for "no limit".
// "" -> null, "abc" -> null, "-5" -> null, "49.99" -> 49
export function parsePrice(text) {
  if (String(text).trim() === "") return null;
  const value = Math.floor(Number(text));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

// Typed the wrong way round ("$100 to $20")? Swap them instead of
// showing nothing.
export function orderPriceRange(minPrice, maxPrice) {
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { minPrice: maxPrice, maxPrice: minPrice };
  }
  return { minPrice, maxPrice };
}
