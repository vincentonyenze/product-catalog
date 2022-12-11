// Everything that draws on the page. These functions take data and update
// the DOM; they never filter, sort or fetch anything themselves.
import { formatPrice, finalPriceCents, starText, formatCount, stockLabel } from "./format.js";

export const elements = {
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  filters: document.getElementById("filters"),
  filtersForm: document.getElementById("filters-form"),
  categoryList: document.getElementById("category-list"),
  priceMin: document.getElementById("price-min"),
  priceMax: document.getElementById("price-max"),
  clearFilters: document.getElementById("clear-filters"),
  resultsTitle: document.getElementById("results-title"),
  resultsCount: document.getElementById("results-count"),
  sortSelect: document.getElementById("sort-select"),
  activeFilters: document.getElementById("active-filters"),
  status: document.getElementById("status"),
  statusIcon: document.getElementById("status-icon"),
  statusMessage: document.getElementById("status-message"),
  statusAction: document.getElementById("status-action"),
  grid: document.getElementById("product-grid"),
  pagination: document.getElementById("pagination"),
  cardTemplate: document.getElementById("product-card-template"),
};

// ===== Product cards =====
// categoryNames: { electronics: "Electronics", ... } for the small label
function createProductCard(product, categoryNames) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".product-card");
  const $ = (selector) => card.querySelector(selector);

  $(".product-card__emoji").textContent = product.emoji;
  $(".product-card__category").textContent = categoryNames[product.category] ?? product.category;
  $(".product-card__name").textContent = product.name;
  $(".product-card__brand").textContent = product.brand;

  // On screen: ★★★★☆ 4.4 (196). Screen readers get a sentence instead.
  $(".stars").textContent = starText(product.rating);
  const ratingText = $(".product-card__rating-text");
  ratingText.textContent = `${product.rating.toFixed(1)} (${formatCount(product.reviewCount)})`;
  ratingText.setAttribute("aria-hidden", "true");
  const spoken = document.createElement("span");
  spoken.className = "visually-hidden";
  spoken.textContent =
    `Rated ${product.rating.toFixed(1)} out of 5 from ${formatCount(product.reviewCount)} reviews`;
  ratingText.after(spoken);

  // Price: the sale price, with the old one crossed out
  $(".product-card__price-now").textContent = formatPrice(finalPriceCents(product));
  const badge = $(".product-card__badge");
  if (product.discountPercent > 0) {
    card.classList.add("product-card--sale");
    const was = $(".product-card__price-was");
    was.hidden = false;
    was.textContent = formatPrice(product.priceCents);
    badge.hidden = false;
    badge.textContent = `−${product.discountPercent}%`;
  }

  // Stock. "Sold out" wins over a sale badge: you can't buy it anyway.
  const stock = stockLabel(product.stock);
  $(".product-card__stock").textContent = stock.text;
  if (stock.level === "none") {
    card.classList.add("product-card--sold-out");
    badge.hidden = false;
    badge.textContent = "Sold out";
    badge.classList.add("product-card__badge--muted");
  }

  return fragment;
}

export function renderProducts(products, categoryNames) {
  elements.grid.replaceChildren(
    ...products.map((product) => createProductCard(product, categoryNames))
  );
  elements.grid.hidden = products.length === 0;
}

export function renderCount(count) {
  elements.resultsCount.textContent = `${formatCount(count)} product${count === 1 ? "" : "s"}`;
}

// ===== Status: loading, error, nothing found =====
// action: { label, onClick } for a button such as "Try again", or null
let statusActionHandler = null;

export function showStatus({ icon, message, action = null }) {
  elements.statusIcon.textContent = icon;
  elements.statusMessage.textContent = message;
  elements.statusAction.hidden = !action;
  if (action) elements.statusAction.textContent = action.label;
  statusActionHandler = action?.onClick ?? null;
  elements.status.hidden = false;
}

export function hideStatus() {
  elements.status.hidden = true;
}

elements.statusAction.addEventListener("click", () => statusActionHandler?.());
