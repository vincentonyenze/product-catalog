// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the rules (catalog.js) and the page (ui.js).
import { loadCatalog } from "./api.js";
import { getResults, countByCategory, parsePrice, orderPriceRange } from "./catalog.js";
import { debounce } from "./utils.js";
import {
  elements,
  renderProducts,
  renderCount,
  showStatus,
  hideStatus,
  renderCategoryOptions,
  updateCategoryOptions,
  readFilters,
  writeFilters,
} from "./ui.js";

// Searching 120 products is instant, but waiting for a short pause means
// the grid doesn't flicker on every single letter
const SEARCH_DELAY_MS = 250;
// Wait a little longer for prices: "1", "12", "120" are all on the way to 120
const PRICE_DELAY_MS = 500;

// What a fresh visit shows: nothing searched, nothing filtered
// (catalog.js explains each field)
const EMPTY_QUERY = {
  search: "",
  categories: [],
  minPrice: null,
  maxPrice: null,
  minRating: 0,
  inStock: false,
  onSale: false,
};

// Filled once the data arrives
let catalog = { categories: [], products: [] };
// { electronics: "Electronics", ... }, for looking names up quickly
let categoryNames = {};

// What the shopper has asked for. Every change goes: update the query,
// then render(). Sorting and the page number join it soon.
let query = EMPTY_QUERY;

// ===== Drawing =====
// "Results for “x”", the one chosen category's name, or "All products"
function resultsTitle() {
  if (query.search) return `Results for “${query.search}”`;
  if (query.categories.length === 1) return categoryNames[query.categories[0]];
  return "All products";
}

// Work out the results from scratch and draw them. Nothing about the
// results is stored: it's always calculated from `catalog` and `query`.
function render() {
  const results = getResults(catalog.products, query, categoryNames);

  elements.resultsTitle.textContent = resultsTitle();
  renderCount(results.length);
  renderProducts(results, categoryNames);
  updateCategoryOptions(countByCategory(catalog.products, query, categoryNames), query.categories);

  if (results.length === 0) {
    const message = query.search
      ? `No products match “${query.search}” with these filters.`
      : "No products match these filters.";
    showStatus({
      icon: "🔍",
      message,
      action: { label: "Clear all filters", onClick: clearAll },
    });
  } else {
    hideStatus();
  }
}

// ===== Search =====
function search() {
  const search = elements.searchInput.value.trim();
  if (search === query.search) return;
  query = { ...query, search };
  render();
}

const searchSoon = debounce(search, SEARCH_DELAY_MS);

// Enter searches straight away, and doesn't reload the page
function handleSearchSubmit(event) {
  event.preventDefault();
  searchSoon.flush();
}

// ===== Filters =====
// Read the whole filter form into the query. Every filter goes through
// here, so they can never get out of step with each other.
function applyFilters() {
  const filters = readFilters();
  const { minPrice, maxPrice } = orderPriceRange(
    parsePrice(filters.minPriceText),
    parsePrice(filters.maxPriceText)
  );
  const next = {
    ...query,
    categories: filters.categories,
    minPrice,
    maxPrice,
    minRating: filters.minRating,
    inStock: filters.inStock,
    onSale: filters.onSale,
  };
  // Nothing actually changed (e.g. "50" -> "50."): don't redraw
  if (JSON.stringify(next) === JSON.stringify(query)) return;
  query = next;
  render();
}

const applyFiltersSoon = debounce(applyFilters, PRICE_DELAY_MS);

// One listener for the whole form. Checkboxes and radios apply at once;
// typing a price waits for a pause.
function handleFiltersInput(event) {
  if (event.target.type === "number") applyFiltersSoon();
  else applyFilters();
}

// Leaving a price box (or pressing Enter in it) applies it straight away,
// and tidies what's shown: "100" to "20" becomes "20" to "100"
function handlePriceDone() {
  applyFiltersSoon.flush();
  writeFilters(query);
}

// Back to a fresh start: no search, no filters
function clearAll() {
  query = EMPTY_QUERY;
  elements.searchInput.value = "";
  writeFilters(query);
  render();
}

// ===== Start =====
async function start() {
  showStatus({ icon: "⏳", message: "Loading products…" });
  elements.grid.hidden = true;

  try {
    catalog = await loadCatalog();
  } catch (error) {
    showStatus({
      icon: "⚠️",
      message: error.message,
      action: { label: "Try again", onClick: start },
    });
    return;
  }

  categoryNames = Object.fromEntries(catalog.categories.map((c) => [c.slug, c.name]));
  renderCategoryOptions(catalog.categories);
  render();
}

elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.filtersForm.addEventListener("input", handleFiltersInput);
elements.priceMin.addEventListener("change", handlePriceDone);
elements.priceMax.addEventListener("change", handlePriceDone);
elements.clearFilters.addEventListener("click", clearAll);
// The filters are a form only for its built-in controls; never submit it.
// (Enter in a price box tries to submit: treat it as "done".)
elements.filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handlePriceDone();
});

start();
