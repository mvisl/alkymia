# Living engraving — night prototype

Standalone study. Main `/world/` is unchanged and compact screens still use the card edition.

- Original boosted artwork provides fixed and foreground colours.
- Generated masks separate the near left bank and the entire right foreground tree/root bank.
- A repaired plate is exposed only in foreground cutouts.
- Very small pointer parallax, shared camera approach and extra near-plane scale.
- Sky drift and reflection displacement are deliberately subtle; moon and buildings remain stable.
- Hold comparison (pointer or Enter/Space), pause, reset, range input and stage keyboard controls.
- Respects reduced motion; offscreen document avoids updating SVG transforms.

The new panorama-only city silhouette separates architecture from the distant landscape. River/ground holes are filled; moon and near trees are subtracted. Generator padding is mapped explicitly: image content y79..644 of 2172×724 maps to the 1672×435 scene. City motion is limited to 1.8 source px plus 0.4% approach scale to avoid exposing inaccurate hidden geometry. No true dolly zoom is claimed.

## Landmark pass

Main tower/base, aquarium, palace and front bridge are separated from the small city by a second panorama-only mask. Their source colours are unchanged. Independent motion remains deliberately limited: city 1.1px / 0.3% extra scale, landmarks 2.8px / 0.7%, near planes 6/8px plus 2.5/3.5% extra scale. Landmark mask and Architecture mask can be inspected separately. Moon stays in sky; near trees are excluded from both architectural masks. Pause freezes layer transforms, and reduced motion disables both animation and camera-approach controls.

Colour images now use panorama-only crops. Explicit SVG image instances are used without forced compositor hints: the earlier combination of masked `<use>` clones and accelerated transforms clipped foreground on wide screens. The 1920px/full-approach pass was checked after this change. Legacy full-sheet source files stay available for old cached pages but current rendering does not request them.

The study also returns to the standard card edition at widths up to 760px, including when resizing into that range. Mobile users do not receive a compressed desktop panorama.
