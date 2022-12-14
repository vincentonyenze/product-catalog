import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  simplify,
  matchesSearch,
  matchesCategories,
  matchesPrice,
  matchesRating,
  matchesAvailability,
  getResults,
  countByCategory,
  parsePrice,
  orderPriceRange,
} from "../js/catalog.js";

// A query with nothing chosen; tests change only what they need
const ANY = {
  search: "",
  categories: [],
  minPrice: null,
  maxPrice: null,
  minRating: 0,
  inStock: false,
  onSale: false,
};

// A small, hand-made catalog: easy to reason about in every test
const product = (id, overrides = {}) => ({
  id,
  name: `Product ${id}`,
  brand: "Brand",
  category: "home",
  priceCents: 1000,
  discountPercent: 0,
  rating: 4,
  reviewCount: 10,
  stock: 10,
  tags: [],
  createdAt: "2022-01-01",
  ...overrides,
});

const headphones = product(1, {
  name: "Pro Wireless Headphones",
  brand: "Voltix",
  category: "electronics",
  tags: ["audio", "wireless", "bluetooth"],
});
const perfume = product(2, { name: "Radiant Perfume", brand: "Lumière", category: "beauty", tags: ["fragrance"] });
const mouse = product(3, { name: "Wireless Mouse", brand: "Pixelon", category: "electronics", tags: ["computer"] });

const categoryNames = { electronics: "Electronics", beauty: "Beauty" };

describe("simplify", () => {
  test("makes text lower case", () => {
    assert.equal(simplify("HeadPHONES"), "headphones");
  });

  test("removes accents", () => {
    assert.equal(simplify("Lumière Crème"), "lumiere creme");
  });
});

describe("matchesSearch", () => {
  test("matches everything when there's no search", () => {
    assert.equal(matchesSearch(headphones, ""), true);
    assert.equal(matchesSearch(headphones, "   "), true);
  });

  test("matches the name, ignoring case", () => {
    assert.equal(matchesSearch(headphones, "HEADPHONES"), true);
  });

  test("matches part of a word", () => {
    assert.equal(matchesSearch(headphones, "head"), true);
  });

  test("matches the brand", () => {
    assert.equal(matchesSearch(headphones, "voltix"), true);
  });

  test("matches a tag", () => {
    assert.equal(matchesSearch(headphones, "bluetooth"), true);
  });

  test("matches the category's name", () => {
    assert.equal(matchesSearch(headphones, "electronics", categoryNames), true);
  });

  test("matches without typing the accent", () => {
    assert.equal(matchesSearch(perfume, "lumiere"), true);
  });

  test("needs every word to match, in any order", () => {
    assert.equal(matchesSearch(headphones, "audio wireless"), true);
    assert.equal(matchesSearch(mouse, "audio wireless"), false);
  });

  test("doesn't match unrelated words", () => {
    assert.equal(matchesSearch(headphones, "perfume"), false);
  });
});

describe("getResults", () => {
  const products = [headphones, perfume, mouse];

  test("returns everything with no search", () => {
    assert.equal(getResults(products, { ...ANY, search: "", categories: [] }).length, 3);
  });

  test("returns only the matches", () => {
    assert.deepEqual(
      getResults(products, { ...ANY, search: "wireless", categories: [] }).map((p) => p.id),
      [1, 3]
    );
  });

  test("doesn't change the list it was given", () => {
    const copy = [...products];
    getResults(products, { ...ANY, search: "wireless", categories: [] });
    assert.deepEqual(products, copy);
  });
});

describe("matchesCategories", () => {
  test("matches everything when no category is ticked", () => {
    assert.equal(matchesCategories(perfume, []), true);
  });

  test("matches a ticked category", () => {
    assert.equal(matchesCategories(perfume, ["beauty"]), true);
  });

  test("matches any of several ticked categories", () => {
    assert.equal(matchesCategories(perfume, ["electronics", "beauty"]), true);
  });

  test("doesn't match other categories", () => {
    assert.equal(matchesCategories(perfume, ["electronics"]), false);
  });
});

describe("getResults with search and categories", () => {
  const products = [headphones, perfume, mouse];

  test("needs a product to pass both", () => {
    // "wireless" matches headphones and mouse; only they're electronics
    const results = getResults(products, { ...ANY, search: "wireless", categories: ["beauty"] });
    assert.deepEqual(results, []);
  });

  test("combines them", () => {
    const results = getResults(products, { ...ANY, search: "pro", categories: ["electronics"] });
    assert.deepEqual(results.map((p) => p.id), [1]);
  });
});

describe("countByCategory", () => {
  const products = [headphones, perfume, mouse];

  test("counts the products in each category", () => {
    assert.deepEqual(countByCategory(products, { ...ANY, search: "", categories: [] }), {
      electronics: 2,
      beauty: 1,
    });
  });

  test("follows the search", () => {
    assert.deepEqual(countByCategory(products, { ...ANY, search: "mouse", categories: [] }), {
      electronics: 1,
    });
  });

  test("ignores the ticked categories, so the others still show their counts", () => {
    assert.deepEqual(countByCategory(products, { ...ANY, search: "", categories: ["beauty"] }), {
      electronics: 2,
      beauty: 1,
    });
  });
});

describe("matchesPrice", () => {
  const item = product(10, { priceCents: 5000 }); // $50.00

  test("has no limits when both are null", () => {
    assert.equal(matchesPrice(item, null, null), true);
  });

  test("includes prices exactly on the limits", () => {
    assert.equal(matchesPrice(item, 50, 50), true);
  });

  test("leaves out prices below the minimum", () => {
    assert.equal(matchesPrice(item, 51, null), false);
  });

  test("leaves out prices above the maximum", () => {
    assert.equal(matchesPrice(item, null, 49), false);
  });

  test("uses the price after the discount", () => {
    // $50 with 20% off is $40: under a $45 maximum
    const onSale = product(11, { priceCents: 5000, discountPercent: 20 });
    assert.equal(matchesPrice(onSale, null, 45), true);
  });
});

describe("matchesRating", () => {
  test("includes ratings at or above the minimum", () => {
    assert.equal(matchesRating(product(1, { rating: 4 }), 4), true);
    assert.equal(matchesRating(product(1, { rating: 4.7 }), 4), true);
  });

  test("leaves out lower ratings", () => {
    assert.equal(matchesRating(product(1, { rating: 3.9 }), 4), false);
  });
});

describe("matchesAvailability", () => {
  const soldOut = product(1, { stock: 0 });
  const onSale = product(2, { discountPercent: 15 });

  test("shows everything when neither box is ticked", () => {
    assert.equal(matchesAvailability(soldOut, { inStock: false, onSale: false }), true);
  });

  test("in stock only leaves out sold-out products", () => {
    assert.equal(matchesAvailability(soldOut, { inStock: true, onSale: false }), false);
  });

  test("on sale only leaves out full-price products", () => {
    assert.equal(matchesAvailability(soldOut, { inStock: false, onSale: true }), false);
    assert.equal(matchesAvailability(onSale, { inStock: false, onSale: true }), true);
  });
});

describe("getResults with every filter", () => {
  const cheapGood = product(1, { priceCents: 1500, rating: 4.5, category: "books" });
  const cheapBad = product(2, { priceCents: 1500, rating: 2.5, category: "books" });
  const pricey = product(3, { priceCents: 90000, rating: 4.8, category: "electronics" });
  const soldOut = product(4, { priceCents: 1500, rating: 4.9, stock: 0, category: "books" });
  const products = [cheapGood, cheapBad, pricey, soldOut];

  test("returns everything when nothing is chosen", () => {
    assert.equal(getResults(products, ANY).length, 4);
  });

  test("needs a product to pass every filter at once", () => {
    const query = { ...ANY, maxPrice: 50, minRating: 4, inStock: true };
    assert.deepEqual(getResults(products, query).map((p) => p.id), [1]);
  });

  test("category counts follow the other filters", () => {
    const query = { ...ANY, maxPrice: 50 };
    assert.deepEqual(countByCategory(products, query), { books: 3 });
  });
});

describe("parsePrice", () => {
  test("is null for an empty box", () => {
    assert.equal(parsePrice(""), null);
    assert.equal(parsePrice("   "), null);
  });

  test("reads whole dollars", () => {
    assert.equal(parsePrice("49"), 49);
  });

  test("drops cents", () => {
    assert.equal(parsePrice("49.99"), 49);
  });

  test("is null for anything that isn't a price", () => {
    assert.equal(parsePrice("abc"), null);
    assert.equal(parsePrice("-5"), null);
  });

  test("allows 0", () => {
    assert.equal(parsePrice("0"), 0);
  });
});

describe("orderPriceRange", () => {
  test("swaps a range typed the wrong way round", () => {
    assert.deepEqual(orderPriceRange(100, 20), { minPrice: 20, maxPrice: 100 });
  });

  test("leaves a correct range alone", () => {
    assert.deepEqual(orderPriceRange(20, 100), { minPrice: 20, maxPrice: 100 });
  });

  test("leaves a range with one side empty alone", () => {
    assert.deepEqual(orderPriceRange(100, null), { minPrice: 100, maxPrice: null });
  });
});
