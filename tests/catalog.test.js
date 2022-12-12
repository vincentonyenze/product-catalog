import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { simplify, matchesSearch, getResults } from "../js/catalog.js";

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
    assert.equal(getResults(products, { search: "" }).length, 3);
  });

  test("returns only the matches", () => {
    assert.deepEqual(
      getResults(products, { search: "wireless" }).map((p) => p.id),
      [1, 3]
    );
  });

  test("doesn't change the list it was given", () => {
    const copy = [...products];
    getResults(products, { search: "wireless" });
    assert.deepEqual(products, copy);
  });
});
