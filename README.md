# Alkymia — public website

A static, responsive Living Engraving design study. This is the world revealed after the future opening sequence; the opening and immersive interiors are not implemented yet. All copy is preliminary. No client work or contact information is invented.

## Run

No dependencies or build step. Serve this directory:

```sh
python3 -m http.server 4173
```

Open http://localhost:4173. GitHub Pages deploys on pushes to main.

## Foundations

- `scene.js` owns stable destination IDs, English labels, preview copy and panorama hotspot coordinates.
- The canonical day artwork is `assets/world-day.png` (1672 × 941). The panorama uses viewBox `0 80 1672 435`. Hotspots are percentages of this viewport, not percentages of the full image.
- The five desktop hotspots have equivalent semantic text links. On mobile the five illustrated destinations form a vertical list. The landscape is an introductory crop, not the required navigation.
- Hash URLs open accessible native dialogs, with keyboard dismissal, focus return and previous/next destinations. These destination IDs should survive replacement by full pages or immersive interiors.
- UI typography is live HTML. Original navigation labels below the vignettes are excluded by viewport crops; small lettering drawn into the architecture remains part of the concept art. The illustration is a flattened concept master, not a clean layered production asset.
- Future motion must resolve to the same geography, keep text and navigation outside the render, and support skip/reduced motion. Keep original art masters separate from delivery exports. Do not infer a 3D reconstruction contract from this PNG.

This repository contains only the public site. Private project research and consultation transcripts are intentionally kept in the separate private Alberto repository. Edit the source in its `website/` subtree; publish using a subtree split, never by changing the visibility of the private repository.

## Lighting previews

Night is the initial state. Night / Sunset / Day changes the panorama, destination illustrations, page background, text and dialog palette. Images decode before switching, with a 1.8-second crossfade; reduced-motion disables transitions. No automatic cycle. Existing three concept artworks are used unchanged: they have small drawing differences, so this is an art-direction preview, not a production relighting of pixel-aligned layers. A final continuous lighting sequence needs aligned production art or a shared scene. All assets are local to this repository, not Downloads.

The illumination control floats at the top right, with circular cells in Day → Sunset → Night order. The indicator slides and the active icon gently settles; reduced-motion disables both. Mobile navigation (≤650px) uses a left drawer with a top-left menu button, native modal focus handling, backdrop/Escape dismissal and automatic close when a destination is selected. Desktop navigation remains visible.

The brand wordmark is a hand-built vector approximation of the thin letterforms in the original generated concept (`assets/alkymia-wordmark.svg`), not a claimed identification of a commercial font or a pixel-exact trace. Both views reference the same paths. It inherits the current ink palette; surrounding site typography is unchanged.
