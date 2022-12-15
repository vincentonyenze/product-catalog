// Entry point: the only script loaded by index.html.
// It connects the data (api.js), the rules (catalog.js) and the page (ui.js).
import { loadCatalog } from "./api.js";
import {
  getResults,
  countByCategory,
  parsePrice,
  orderPriceRange,
  sortProducts,
  DEFAULT_SORT,
  paginate,
  pageNumbers,
} from "./catalog.js";
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
  renderPagination,
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
  sort: DEFAULT_SORT,
  page: 1,
};

// Filled once the data arrives
let catalog = { categories: [], products: [] };
// { electronics: "Electronics", ... }, for looking names up quickly
let categoryNames = {};

// What the shopper has asked for. Every change goes: update the query,
// then render(). Any change other than the page itself goes back to
// page 1: page 4 of the old results means nothing for the new ones.
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
  // Filter first, then sort: sorting 20 matches is less work than 120.
  // Then cut out just the page being looked at.
  const results = sortProducts(getResults(catalog.products, query, categoryNames), query.sort);
  const page = paginate(results, query.page);
  // A page that doesn't exist (too big, or 0) was moved to a real one
  query = { ...query, page: page.page };

  elements.resultsTitle.textContent = resultsTitle();
  renderCount(page);
  renderProducts(page.items, categoryNames);
  renderPagination(page.page, page.totalPages, pageNumbers(page.page, page.totalPages));
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
  query = { ...query, search, page: 1 };
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
  // Nothing actually changed (e.g. "50" -> "50."): don't redraw, and
  // don't lose your page
  if (JSON.stringify(next) === JSON.stringify(query)) return;
  query = { ...next, page: 1 };
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

// ===== Sorting =====
function handleSortChange() {
  query = { ...query, sort: elements.sortSelect.value, page: 1 };
  render();
}

// ===== Pages =====
// One listener for every page button (they're rebuilt on each render)
function handlePaginationClick(event) {
  const button = event.target.closest(".page-btn");
  if (!button || button.disabled) return;

  query = { ...query, page: Number(button.dataset.page) };
  render();

  // Back to the top of the results. Focusing the heading also moves
  // screen readers and keyboard users there, instead of leaving them at
  // the bottom of a page they can no longer see.
  elements.resultsTitle.focus({ preventScroll: true });
  elements.resultsTitle.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Back to a fresh start: no search, no filters. The sort order stays:
// it's how you like to look at things, not something you filtered by.
function clearAll() {
  query = { ...EMPTY_QUERY, sort: query.sort };
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
  // Browsers can keep a <select>'s old value after a refresh: match the query
  elements.sortSelect.value = query.sort;
  render();
}

elements.searchInput.addEventListener("input", searchSoon);
elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.filtersForm.addEventListener("input", handleFiltersInput);
elements.priceMin.addEventListener("change", handlePriceDone);
elements.priceMax.addEventListener("change", handlePriceDone);
elements.clearFilters.addEventListener("click", clearAll);
elements.sortSelect.addEventListener("change", handleSortChange);
elements.pagination.addEventListener("click", handlePaginationClick);
// The filters are a form only for its built-in controls; never submit it.
// (Enter in a price box tries to submit: treat it as "done".)
elements.filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handlePriceDone();
});

start();
