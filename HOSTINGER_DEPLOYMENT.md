# Hostinger deployment: realstate.mohammadbarique.online

Live address: https://realstate.mohammadbarique.online

The domain serves the app over HTTPS and its direct routes work. The currently uploaded version was verified to use browser-local demo storage. Upload the replacement Supabase build below to activate the connected application.

## Prepared replacement

- Archive: `artifacts/hostinger-realstate-supabase.zip`
- Source of archive: contents of `dist/`, with `index.html` at the ZIP root.
- Hostinger routing: `.htaccess` included.
- Production configuration: ignored `.env.production.local`, with `VITE_DATA_BACKEND=supabase`, the project URL and its public publishable key.
- The build was scanned for the actual private API key, access token and account-setup URL; none is present.
- The exact production build passed a browser test against the hosted database: public inquiry, real login, assignment, agent isolation, follow-up, viewing, won deal and persistence after reload. Temporary test data was removed.

## Upload in hPanel

1. Open File Manager for the document root assigned to **realstate.mohammadbarique.online**. For a subdomain this may be a folder inside `public_html`; use the folder currently containing this site's `index.html`.
2. Download a backup of that site's current files.
3. Upload `hostinger-realstate-supabase.zip` into that document root and extract its contents there, replacing matching files.
4. Check that `index.html`, `.htaccess`, `assets/`, `images/` and `favicon.svg` are directly in the site's root. There should be no extra `dist/` folder around them.
5. Remove the uploaded ZIP from the public directory after extraction. Keep your local backup/archive.
6. Clear the website cache in Hostinger if enabled, then hard-refresh the site or use a fresh private browser window.

Only the ZIP's static build files belong on the website. Keep `.env*`, account-setup links, server scripts and administrative keys on your computer.

## Supabase settings already applied

Site URL: `https://realstate.mohammadbarique.online`

Password-reset/invitation redirect: `https://realstate.mohammadbarique.online/reset-password`

The localhost redirect is retained for development. The administrator account is already activated; its existing password works on the deployed site once the replacement build is uploaded.

## Verify after upload

Open `/login` directly and refresh it. Connected mode shows the real sign-in form without demo-login shortcuts. Sign in with your administrator account, verify the Supabase workspace, and confirm a new website inquiry appears in the CRM.

For an automated acceptance check from this project:

```sh
npm run supabase:smoke -- https://realstate.mohammadbarique.online
```

For subsequent frontend updates, run `npm run build` and upload the new `dist/` contents. Supabase data stays in the hosted database. Import any older browser-only CRM edits using Settings in the original browser and origin where those edits were saved.
