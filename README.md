# Product Catalog

A searchable shop catalog with filters, sorting and pagination, where **everything lives in the URL**: refresh, bookmark or share a link and you see exactly the same results, and the browser's **Back button** steps through your choices. Built with plain HTML, CSS and JavaScript (no frameworks or libraries) and covered by **104 automated tests**.

This is **Project 11** in my beginner-to-expert web development roadmap (Level 2).

<!-- Add a screenshot: save one as screenshot.png in this folder and uncomment the line below -->
<!-- ![Product catalog screenshot](screenshot.png) -->

## Features

- **Search** names, brands, categories and tags: every word must match, in any order, ignoring case and accents (`creme` would find *crème*)
- **Filters**: categories (with live counts), price range, minimum rating, in stock only, on sale
- **Sorting**: featured, price (low/high), customer rating, newest, most reviewed
- **Pagination**: 12 per page, with `‹ 1 … 4 5 6 … 17 ›` buttons and *"Showing 13–24 of 194"*
- **Shareable URLs**: `?q=lamp&category=home&max=50&sort=price-asc&page=2`
- **Back and Forward** step through filter changes (one step per search, not per letter)
- **Active filter chips**: "Shoes ✕", "Up to $50 ✕", each removable on its own, plus Clear all
- **194 real products with real photos**, stored in the project so the shop works offline
- Sale prices and "Sold out" / "Only 3 left" labels
- Photos load lazily as you scroll, with a placeholder if one fails
- **Mobile filter drawer** that behaves like a dialog, with a "Show 24 results" button
- Loading, error (with Try again) and "nothing found" states
- Keyboard and screen-reader friendly: skip link, focus management, announced result counts
- Light and dark themes, following your system

## How the URL works

The whole state of the page is one `query` object, and the URL is a copy of it:

```
{ search: "lamp", categories: ["home"], maxPrice: 50, sort: "price-asc", page: 2 }
                                ⇅
?q=lamp&category=home&max=50&sort=price-asc&page=2
```

- **Only non-default values** go in the URL, so a fresh visit has no query string at all.
- **Nothing from the URL is trusted.** Unknown categories, sorts and ratings are ignored, bad prices and page numbers fall back to "not set", and `?page=999` lands on the last real page.
- Changes you make use `history.pushState` (a Back-button step). Tidying up, like correcting a page number that doesn't exist, uses `replaceState`. Back and Forward fire `popstate`, which reads the URL and redraws.

## How the results are worked out

Every change runs the same pipeline from scratch, so the results can never go stale:

```
all products → filter (every rule must pass) → sort → cut out one page → draw
```

- **Filters:** OR *inside* a filter (Shoes **or** Clothing), AND *between* filters (… **and** under $50).
- **Category counts** use every filter *except* categories, so they answer "how many would I see if I ticked this?"
- **Sorting** always ends with a tie-breaker on `id`, so the order is fixed and no product appears on two pages.
- **Prices are stored in cents** (`11349` = $113.49) to avoid floating-point errors, and filters use the price you'd actually pay after discounts.

## Built with

- HTML5 (`<form>`, `<fieldset>` + `<legend>`, `<template>`, `<s>`, `aria-current`, `aria-live`, `inert`)
- CSS3 (Grid layout, sticky sidebar, `accent-color`, `scroll-margin-top`, `prefers-color-scheme`)
- Vanilla JavaScript (ES6+) in ES modules
- `fetch`, `FormData`, `URLSearchParams`, the History API (`pushState`, `replaceState`, `popstate`), `matchMedia`, `Intl.NumberFormat`
- **Node's built-in test runner** (`node --test`)

## What I learned

- **Combining filters** as a list of small rule functions
- **Facet counts**, and why the category filter has to be left out when counting categories
- **Sorting** with compare functions and tie-breakers, and why a fully decided order matters for pagination
- **Pagination** maths, clamping page numbers, and page buttons with gaps
- **The URL as state**: `URLSearchParams`, encoding, and never trusting what's in the address bar
- **The History API**: `pushState` vs `replaceState`, handling `popstate`, and which changes deserve a Back-button step
- **Reading a whole form** with `FormData`
- **Money in cents** and `Intl.NumberFormat` for currency
- **Search** that ignores case and accents, with every word required
- **Dialog behaviour** without `<dialog>`: `inert`, focus in and out, Esc, closing on an outside click
- **One source of truth** (`query`) drawn in several places: the sidebar, the chips, the URL and the results

## How to run

1. Clone the repository:
   ```bash
   git clone https://github.com/vincentonyenze/product-catalog.git
   cd product-catalog
   ```
2. Open the folder in VS Code and start **Live Server** (right-click `index.html` → *Open with Live Server*).

A local server is needed because browsers block ES modules, and `fetch()` of local files, on pages opened straight from a file (`file://`).

## Running the tests

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm test             # run all tests once
npm run test:watch   # re-run them every time a file is saved
```

| File | Tests | Covers |
|---|---|---|
| `tests/catalog.test.js` | 66 | search, every filter, combining them, category counts, sorting, pagination, cleaning typed prices |
| `tests/url.test.js` | 15 | query ⇄ URL, bad URLs, a round trip |
| `tests/format.test.js` | 13 | prices in cents, sale prices, stars, stock labels |
| `tests/chips.test.js` | 10 | chip labels, and what removing each one does |

## Project structure

```
product-catalog/
├── index.html          # Header, filter sidebar/drawer, toolbar, grid, pagination
├── style.css           # Layout, cards, filters, chips, drawer, themes
├── package.json        # npm scripts for the tests
├── data/
│   └── products.json   # 194 products in 9 categories (prices in cents)
├── images/
│   └── products/       # One photo per product (1.webp … 194.webp)
├── js/
│   ├── main.js         # The query, events, history, drawer: connects everything
│   ├── catalog.js      # Search, filter rules, counts, sorting, pagination
│   ├── url.js          # Query ⇄ URL, with validation
│   ├── chips.js        # Active filter chips and how to remove each one
│   ├── format.js       # Prices, stars, counts and stock labels for display
│   ├── api.js          # Loading the catalog (the only file that knows where it lives)
│   ├── ui.js           # Drawing cards, controls, chips, pages and the drawer
│   └── utils.js        # debounce
├── tests/              # Automated tests (node --test)
└── README.md
```

## Known limitations

- The catalog is a local file: prices and stock never change unless the file is updated.
- Search is simple word matching: no typo tolerance and no ranking by relevance.
- All filtering happens in the browser, which is fine for hundreds of products. For thousands, the server would filter and paginate.

## Possible improvements

- A product details page at its own URL (`?product=42`)
- Brand filter and a price slider
- "Did you mean…?" suggestions for misspelled searches
- A shopping cart, which is Project 12 in my roadmap

## Credits

Product names, descriptions and photos come from [DummyJSON](https://dummyjson.com/), a free set of sample data for practising web development. Categories were grouped, and sale discounts and review counts adjusted, to suit this project.
