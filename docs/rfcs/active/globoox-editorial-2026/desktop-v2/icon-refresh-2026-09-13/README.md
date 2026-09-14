---
type: reference
status: current
owner: design-engineering
last_verified: 2026-09-13
---

# User-supplied icon refresh

New icon files supplied by the user are current authority. This explicitly authorizes shared branding assets and associated manifest/metadata changes, superseding the older instruction to retain the old app icon. Landing composition and app behavior remain unchanged. Old project visuals remain secondary; no deployment.

| Usage | Current asset | User source |
| --- | --- | --- |
| Landing header28px and closing CTA56px; SVG favicon | `public/icon.svg` | Exact copy of `temp/icon.svg` |
| Organization logo, ordinary raster512px | `public/icon-512.png` | Exact copy of `temp/icon.png` |
| ICO favicon,32px | `src/app/favicon.ico` and `public/favicon.ico` | Resized ordinary `temp/icon.png`, identical ICO outputs |
| Installed Android/PWA icon512px | `public/app-icon-512.png` | Exact copy of `temp/icon-safe-zone.png` |
| Installed Android/PWA icon192px | `public/app-icon-192.png` | Resized safe-zone source |
| iOS home-screen icon180px | `public/apple-touch-icon.png` | Resized safe-zone source |

Manifest icon candidates now include only safe-zone192/512 PNGs, both with `purpose: any maskable`. Ordinary SVG/ICO/logo candidates are removed from the install manifest to prevent the wrong artwork being chosen. Name, start URL, display and theme settings remain unchanged. Both root/app Apple metadata declare the actual180×180 size and use a new version query; the original Apple file incorrectly contained512×512 pixels. New Android asset filenames distinguish them from previous artwork. The existing two ICO files are kept synchronized; Next's automatic favicon route and explicit links return the same new image.

The provided sources were copied/exported without redrawing. Sharp generated the192/180/32px PNG derivatives; the32px PNG is embedded in a standard single-image ICO container. The512px safe source is fully opaque; its light foreground fits inside the centered radius204.8px mask-safe circle (measured furthest foreground202.6px). Source files and the unrelated dirty billing RFC retain their recorded hashes in `preservation.json`.

## Verification

Fresh anonymous Chrome: visual review of header and closing CTA at1440/390px; rendered favicon and Apple links all return200; app `/my-books` exposes the intended manifest and Apple metadata; every manifest image returns200. See `evidence/browser-checks.json` and four screenshots. Both512px targets match their respective user sources exactly; generated PNG dimensions match declarations. Scoped ESLint and docs/diff checks pass. Actual installation on an iOS/Android device was not performed.

Browser plugin setup still failed on its removed versioned service module, so local Playwright used a fresh anonymous Chrome context without any existing browser session. Captures were written to `/tmp` then archived after review.

Previous assets, manifest and metadata source snapshots are retained under `before/`. No source image deletion, commit, push or deployment.
