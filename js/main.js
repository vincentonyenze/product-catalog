// Entry point: the only script loaded by index.html.
// It connects the data (api.js) to the page (ui.js).
import { loadCatalog } from "./api.js";
import { elements, renderProducts, renderCount, showStatus, hideStatus } from "./ui.js";

// Filled once the data arrives
let catalog = { categories: [], products: [] };
// { electronics: "Electronics", ... }, for looking names up quickly
let categoryNames = {};

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
  hideStatus();
  renderCount(catalog.products.length);
  // All 120 for now: searching, filtering, sorting and pages come next
  renderProducts(catalog.products, categoryNames);
}

start();
