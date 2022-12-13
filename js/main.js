// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the rules (catalog.js) and the page (ui.js).
import { loadCatalog } from "./api.js";
import { getResults, countByCategory } from "./catalog.js";
import { debounce } from "./utils.js";
import {
  elements,
  renderProducts,
  renderCount,
  showStatus,
  hideStatus,
  renderCategoryOptions,
  updateCategoryOptions,
  readCategoryOptions,
} from "./ui.js";

// Searching 120 products is instant, but waiting for a short pause means
// the grid doesn't flicker on every single letter
const SEARCH_DELAY_MS = 250;

// What a fresh visit shows: nothing searched, nothing filtered
const EMPTY_QUERY = {
  search: "",
  categories: [], // category slugs; empty means all
};

// Filled once the data arrives
let catalog = { categories: [], products: [] };
// { electronics: "Electronics", ... }, for looking names up quickly
let categoryNames = {};

// What the shopper has asked for. Every change goes: update the query,
// then render(). Price, rating, sorting and the page number join it soon.
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
// Any checkbox in the category list changed (one listener for them all)
function handleCategoryChange() {
  query = { ...query, categories: readCategoryOptions() };
  render();
}

// Back to a fresh start: no search, no filters
function clearAll() {
  query = EMPTY_QUERY;
  elements.searchInput.value = "";
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
elements.categoryList.addEventListener("change", handleCategoryChange);
elements.clearFilters.addEventListener("click", clearAll);
// The filters are a form only for its built-in controls; never submit it
elements.filtersForm.addEventListener("submit", (event) => event.preventDefault());

start();
