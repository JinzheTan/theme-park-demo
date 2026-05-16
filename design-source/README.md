# Design source files

The SVGs under `svg/` are the **original vector source** for the PNG sprites in `assets/generated/`. They are **not loaded at runtime** — the game only consumes the PNG versions.

Keep these in the repo as reference for re-exports or future redesigns. To regenerate a PNG sprite, edit the SVG, rasterize at the target resolution, and replace the file in `assets/generated/`.
