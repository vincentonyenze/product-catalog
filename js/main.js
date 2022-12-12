// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the rules (catalog.js) and the page (ui.js).
import { loadCatalog } from "./api.js";
import { getResults } from "./catalog.js";
import { debounce } from "./utils.js";
import { elements, renderProducts, renderCount, showStatus, hideStatus } from "./ui.js";

// Searching 120 products is instant, but waiting for a short pause means
// the grid doesn't flicker on every single letter
const SEARCH_DELAY_MS = 250;

// Filled once the data arrives
let catalog = { categories: [], products: [] };
// { electronics: "Electronics", ... }, for looking names up quickly
let categoryNames = {};

// What the shopper has asked for. Every change goes: update the query,
// then render(). Filters, sorting and the page number join it soon.
let query = {
  search: "",
};

// ===== Drawing =====
// Work out the results from scratch and draw them. Nothing about the
// results is stored: it's always calculated from `catalog` and `query`.
function render() {
  const results = getResults(catalog.products, query, categoryNames);

  elements.resultsTitle.textContent = query.search
    ? `Results for “${query.search}”`
    : "All products";
  renderCount(results.length);
  renderProducts(results, categoryNames);

  if (results.length === 0) {
    showStatus({
      icon: "🔍",
      message: `No products match “${query.search}”. Check the spelling or try a shorter search.`,
      action: { label: "Clear search", onClick: clearSearch },
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

function clearSearch() {
  elements.searchInput.value = "";
  search();
  elements.searchInput.focus();
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
  render();
}

elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);

start();
