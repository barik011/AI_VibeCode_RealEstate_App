# Dubai bayt

A complete React frontend for a fictional Dubai property agency, styled from the supplied visual reference. All listings, prices, testimonials, statistics, contact details and editorial copy are demonstration content.

## Run locally

Requires Node.js 22.12+ (or another version supported by Vite 8).

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production commands:

```sh
npm run build
npm run preview
```

## Pages and routes

| Route                           | Page                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`                             | Homepage with five-slide hero, property search, editorial sections, categories, location selector and testimonials |
| `/properties`                   | Property collection, combined filters, sorting, pagination and grid/list views                                     |
| `/property/:slug`               | Gallery, property details, amenities, advisor, inquiry and similar homes                                           |
| `/category/:slug`               | Validated redirect to the corresponding property filter                                                            |
| `/locations`, `/location/:slug` | Eight neighbourhoods and their matching homes                                                                      |
| `/about`, `/invest`             | Agency story, investment overview, process and FAQs                                                                |
| `/blog`, `/blog/:slug`          | Filterable journal and four full articles                                                                          |
| `/contact`                      | Validated inquiry form; supports `?type=expert` and `?location=slug`                                               |
| `/favorites`                    | Persistent saved collection                                                                                        |
| `/search?q=...`                 | Search results with the full filter controls                                                                       |
| `/privacy`, `/terms`            | Demo privacy and terms information                                                                                 |
| `/*`                            | Branded 404; invalid content slugs also show this page                                                             |

Property query parameters: `purpose`, `location`, `type`, `min`, `max`, `beds`, `baths`, `q`, `sort`, `page`. Prices for rental listings are annual. Filter changes reset pagination. Bedrooms and bathrooms are minimum values.

## English and Arabic

Use the **العربية / English** button in the header on desktop or mobile. English is the default; the choice is saved as `dubai-bayt:language`. Changing language preserves the current route, query filters, favorites and entered form data. Arabic updates the document's `lang` and `dir`, typography, page metadata, labels, validation feedback and catalog content.

- `src/i18n/LanguageProvider.jsx`: language context, switch and localized form validation.
- `src/i18n/ar.json`: Arabic interface messages, keyed by the English source text. Use `t('Message')` or `t('Message {0}', { 0: value })` at display boundaries.
- `src/i18n/ar-content.json`: Arabic property, location, category, testimonial and article content.
- `src/i18n/translate.js`: interpolation, price localization and Arabic search normalization.
- `src/i18n/rtl.css`: Arabic fonts and directional visual adjustments. The main stylesheet uses logical spacing and positioning so layouts mirror naturally.

URLs, property IDs and select values stay language-independent. Search accepts English or Arabic, including Arabic with diacritics. Email addresses and phone inputs remain left-to-right. Arabic fonts load from Google Fonts with local fallbacks.

When editing English copy or adding catalog entries, add the corresponding Arabic entries. Run `npm run test:translations` for literal UI coverage, `npm test` for catalog translation coverage, and `npm run test:e2e -- tests/e2e/languages.spec.js --workers=1` for language persistence, Arabic interactions, page coverage and RTL layouts.

## Application structure

- `src/data/`: 20 properties, eight locations, five categories, three testimonials, four articles and centralized site/image configuration in JSON.
- `src/services/catalog.js`: asynchronous collection adapter, property service, filtering and calculated similar-property ranking.
- `src/hooks/useCatalog.jsx`: shared loading/error handling and collection context.
- `src/store/store.js`: Redux Toolkit for favorites; other state stays local or in URL parameters.
- `src/utils/storage.js`: guarded localStorage access with the `dubai-bayt:` prefix.
- `src/components/`: layout, UI primitives, property cards/gallery helpers, search, forms and reusable sections.
- `src/pages/`: lazy-loaded page modules. `App.jsx` contains routing and the error boundary.
- `src/styles.css`: design tokens, Tailwind integration, component styling, breakpoints and reduced-motion rules.

Reusable pieces include Header/Layout, Footer, Logo, Photo with fallback, Button, SectionHeader, PropertyCard/Grid/Facts, FavoriteButton, PropertySearch, Modal, SearchOverlay, ContactForm, NewsletterForm, PageHero, Breadcrumb, EmptyState, Loader, SEO and toast feedback.

Motion handles section reveals, hero text and testimonial fades. The hero uses a 6.5-second interval with CSS crossfades/scale, manual indicators and a pause control. Reduced-motion preferences suppress autoplay and movement. Native dialogs provide focus containment, Escape handling and focus restoration. Mobile navigation locks background scrolling.

## Demo storage

Favorites, newsletter preferences and inquiries stay in the current browser. The application never sends form submissions to a server. Clear the site's browser storage to reset the demo. Forms report when storage is unavailable. Social URLs are configurable platform placeholders; contact details are deliberately non-operational.

Photography is served from Unsplash and typography from Google Fonts; those resources require network access. A local SVG fallback handles failed images. Fonts fall back to Georgia and sans-serif.

Location photography includes [Dubai Marina by Jhonwayne Pumaras](https://unsplash.com/photos/an-aerial-view-of-a-city-and-a-body-of-water-qByXClNnygI) and [Palm Jumeirah by Big Dodzy](https://unsplash.com/photos/aerial-view-of-a-coastal-city-with-many-buildings-psfPhKbF-mw). All image URLs are centralized in the data files.

## Future API integration

Replace `catalogService.getCollection()` in `src/services/catalog.js` with calls to your API. Keep the returned property, location and article schemas stable so page components do not change. `propertyService` exposes `getAll`, `getBySlug`, `getFeatured` and `search`. Add real submission endpoints to the form service layer when a backend is introduced; the current submit handlers intentionally save only to localStorage.

For large catalogs, move search, sorting and pagination to server-side endpoints and adapt the listing data hook to return `{ items, total }`. For search-engine indexing beyond client-side title/description updates, add prerendering or server rendering.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Browser tests cover routes, combined filters, sorting, pagination, galleries, favorites persistence, forms, search, carousels, responsive widths and layout overflow. Desktop and mobile screenshots are saved to `artifacts/`. The Playwright config starts the development server if needed. Only Chromium is configured; Safari and Firefox need separate cross-browser checks before a real production launch.

## Deploy

Run `npm run build` and publish the contents of `dist/`.

- **Netlify / Cloudflare Pages:** build `npm run build`, output directory `dist`. The included `public/_redirects` becomes `dist/_redirects` and rewrites client routes to `index.html`.
- **Vercel:** Vite preset, output `dist`; `vercel.json` includes SPA rewrites.
- **Hostinger / Apache:** upload `dist/` contents to the domain's web root, including the hidden `.htaccess` file. `mod_rewrite` and `AllowOverride` must be enabled.
- **Other static hosts:** serve existing assets normally; rewrite non-file requests to `/index.html` with status 200. Verify a direct request/refresh to `/property/palm-jumeirah-villa`.

The configuration assumes deployment at the domain root. For a subdirectory, update Vite `base`, BrowserRouter `basename`, asset paths and the host rewrite base together.

Before using this as a real agency website, replace demo content, contact/social details and policies with verified business information.
