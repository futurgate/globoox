# Safari-Specific Bugs & Rules

Known Safari pitfalls encountered in this project. **Read this before touching image/canvas/media code.**

---

## 1. Canvas draws black on undecoded images

**Symptom:** Book covers appear as solid black rectangles intermittently, especially on slow connections. Reloading sometimes fixes it.

**Root cause:** Safari fires `img.onload` before image pixel data is fully decoded. Calling `canvas.drawImage()` on a not-yet-decoded image produces black pixels. Chrome/Firefox decode eagerly so they don't hit this.

**Rule:** Never use `img.onload` before drawing to canvas. Always use `img.decode()`:

```ts
// BAD — works in Chrome, black in Safari
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0);
};
img.src = url;

// GOOD — guaranteed decoded
const img = new Image();
img.src = url;
img.decode().then(() => {
  ctx.drawImage(img, 0, 0);
}).catch(() => { /* fallback */ });
```

**Affected code:** `useCompressedCover`, `useCoverAccent`, `useImageAspect` in `BookCard.tsx`.

**Fixed:** 2026-03-25.

---

## Adding new entries

When you encounter a Safari-specific bug, add a numbered section here with:
- **Symptom** — what the user sees
- **Root cause** — why it happens only in Safari
- **Rule** — the pattern to follow going forward
- **Affected code** — files/hooks involved
- **Fixed** — date
