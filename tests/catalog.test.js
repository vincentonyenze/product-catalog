import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  simplify,
  matchesSearch,
  matchesCategories,
  getResults,
  countByCategory,
} from "../js/catalog.js";

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
    assert.equal(getResults(products, { search: "", categories: [] }).length, 3);
  });

  test("returns only the matches", () => {
    assert.deepEqual(
      getResults(products, { search: "wireless", categories: [] }).map((p) => p.id),
      [1, 3]
    );
  });

  test("doesn't change the list it was given", () => {
    const copy = [...products];
    getResults(products, { search: "wireless", categories: [] });
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
    const results = getResults(products, { search: "wireless", categories: ["beauty"] });
    assert.deepEqual(results, []);
  });

  test("combines them", () => {
    const results = getResults(products, { search: "pro", categories: ["electronics"] });
    assert.deepEqual(results.map((p) => p.id), [1]);
  });
});

describe("countByCategory", () => {
  const products = [headphones, perfume, mouse];

  test("counts the products in each category", () => {
    assert.deepEqual(countByCategory(products, { search: "", categories: [] }), {
      electronics: 2,
      beauty: 1,
    });
  });

  test("follows the search", () => {
    assert.deepEqual(countByCategory(products, { search: "mouse", categories: [] }), {
      electronics: 1,
    });
  });

  test("ignores the ticked categories, so the others still show their counts", () => {
    assert.deepEqual(countByCategory(products, { search: "", categories: ["beauty"] }), {
      electronics: 2,
      beauty: 1,
    });
  });
});
