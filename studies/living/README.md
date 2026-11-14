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
