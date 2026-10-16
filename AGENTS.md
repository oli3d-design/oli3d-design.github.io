# AGENTS.md

Static Spanish-language catalog site for a 3D printing business. Deployed via GitHub Pages directly from the repo root — **every push to `main` is production**.

## Architecture (non-obvious bits)

- **No build step, no package manager.** Pure HTML/CSS/vanilla JS. There is no `package.json`, no bundler, no TypeScript. Do not introduce one without asking.
- **JS is loaded via `<script>` tags, not ES modules.** Each file exposes a global namespace (`window.ProductsModule`, `window.MainUtils`). Load order matters: `products.js` → `main.js` → page script.
- **"Database" is three static JSON files** in `db/` (`products.json`, `categories.json`, `settings.json`), fetched client-side. Edits to product data = edits to these JSON files.
- **`local/` is gitignored** (see `.gitignore`) and never deployed. It is split into `local/wallapop/` (admin panel + Wallapop uploader, see below) and `local/vinted/` (in-progress Vinted uploader). Do not import from `local/` in any web asset.
- **Visibility rule** (enforced in `js/products.js` → `isProductVisible`): a product is hidden if `product.hidden === true` **OR** every category it belongs to is `hidden: true` in `categories.json`. Seasonal categories (christmas, halloween) are toggled via this flag — don't assume a product is broken just because it doesn't appear.
- **Global price kill-switch:** `db/settings.json` → `showPrices`. When false, `renderProductCard` and the mailto body omit prices. Respect this whenever rendering products.

## Cache-busting (easy to miss)

Script tags use a manual `?v=N` query string (the stylesheet link too). When you change a JS or CSS file, bump the version in **every** HTML page that loads it (`index`, `shop`, `product`, `about`, `contact`, `404`). All pages are currently at `?v=14`.

## Local dev

```bash
python3 -m http.server 3000      # preview site at localhost:3000
python3 local/wallapop/admin.py  # admin panel at localhost:5050 (auto-opens browser)
```

Admin deps: `pip install flask` (plus `playwright` for `local/wallapop/upload_wallapop.py`). A `.venv/` exists locally but is gitignored.

## `local/` scripts (Wallapop sync + admin tooling)

The site is a catalog mirror of the owner's Wallapop listings. `local/wallapop/` holds the tooling that keeps the two in sync; `local/vinted/` is reserved for the in-progress Vinted equivalent. All gitignored, run manually from the repo root.

- **`local/wallapop/admin.py`** — Flask CRUD UI for `db/*.json` on port 5050. "Guardar Cambios" runs `git add/commit/push` via `subprocess`. Path constant `BASE_DIR` resolves to the repo root via `parent.parent.parent`.
- **`local/wallapop/upload_wallapop.py`** — Playwright bot that publishes products to Wallapop and writes the resulting listing URL back into `db/products.json` (`wallapopLink`). Two accounts are supported (regular + pokeballs) with separate session state in `local/wallapop/sessions/` and persistent Chrome profile in `local/wallapop/chrome_profile/`. CLI:
  ```bash
  python3 local/wallapop/upload_wallapop.py --login --pokeballs           # one-time: save session
  python3 local/wallapop/upload_wallapop.py --id <product_id>             # publish one product
  python3 local/wallapop/upload_wallapop.py --pokeballs                   # batch: pokeballs account
  python3 local/wallapop/upload_wallapop.py --non-pokeballs               # batch: main account
  python3 local/wallapop/upload_wallapop.py --all                         # everything
  # optional: --cdp (attach to running Chrome on :9222), --debug (dump local/wallapop/debug_screenshots/)
  ```
  Account routing is by category: a product with `"pokeballs"` in `categories` goes to the pokeballs account.
- **`local/wallapop/import_pokeballs.py`** — one-shot importer that copies images from a hard-coded `~/Downloads/Pokeballs 2` path into `products/` and appends entries to `db/products.json`. Paths are hard-coded to a previous user; edit before reuse.
- **`local/wallapop/migrate_products.py`** — one-shot schema backfill (`wallapopLink`, `vintedLink`, `weight`). Already applied; only re-run after adding new schema fields.

When adding scripts under `local/wallapop/` or `local/vinted/`, the script is three levels deep, so resolve the repo root with `Path(__file__).resolve().parent.parent.parent` (see `wallapop/admin.py`, `wallapop/migrate_products.py`). Keep runtime artifacts (sessions, browser profile, screenshots, logs) inside the script's own subfolder, not at `local/` root.

## Conventions

- UI copy is **Spanish**; code identifiers and comments are **English**.
- Product IDs: `snake_case` (e.g. `bolas_navidad`). Category IDs: lowercase single word.
- CSS: single global `css/styles.css` with `:root` design tokens ("Capa a capa" system: `--navy`, `--blue`, `--sky`, `--grey`, `--bed`, `--space-*`, `--r-*`; fonts Unbounded + Atkinson Hyperlegible). Web-optimised images live in `resources/web/`. **Exception:** `shop.html` has a large inline `<style>` block for shop-specific layout — match the existing pattern there rather than relocating.
- Indent in JS is mixed (2-space in `products.js`/`product-detail.js`, 4-space in `main.js`/`home.js`/`shop.js`). Match the file you're editing.
- Product image extensions are case-sensitive on GitHub Pages — both `.jpg` and `.JPG` exist in `products/`. Reference filenames exactly as stored.

## No tests, no CI, no linter

There is nothing to run for verification. Manual browser check is the only QA. Don't fabricate test commands.

## Deploy

`git push` to `main` → GitHub Pages serves the repo as-is. No staging environment. The admin panel's "Guardar Cambios" button does this push automatically via `subprocess` in `local/admin.py`.

## Installed Skills

These specialized project-installed skill sets extend the agent's capabilities:

- **playwright-cli** — Automate browser interactions, test web pages, and work with Playwright tests.
  - Path: [playwright-cli/SKILL.md](.agents/skills/playwright-cli/SKILL.md)
