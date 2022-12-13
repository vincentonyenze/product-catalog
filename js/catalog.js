// The catalog "engine": which products to show for the current query.
// Pure functions only (products and a query in, products out), tested in
// tests/catalog.test.js. Search comes first; filters, sorting and pages
// are added in the next steps.

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

// The products to show for a query. A product has to pass EVERY rule.
// More rules join this in the next steps.
export function getResults(products, query, categoryNames = {}) {
  return products.filter(
    (product) =>
      matchesSearch(product, query.search, categoryNames) &&
      matchesCategories(product, query.categories)
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
