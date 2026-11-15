# Alkymia motion study

Separate comparison at `/studies/motion/`; does not replace `/world/`.
Run the usual static server from the repository root:

```sh
python3 -m http.server 4173 --directory website
```

GPU uses PixiJS 8.22.0 with WebGL and DPR capped at 2. CSS uses the same textures and camera poses. Pixi is vendored under `../../vendor/pixi-8.22.0/` from the published npm package via jsDelivr; its MIT license is included. No installation/build step. If WebGL initialization or rendering fails, CSS remains available. Context restoration enables GPU selection again.

The native horizontal scroll element supplies input, while one camera positions the visible scene. Wheel and drag cancel automatic drift immediately, retaining the current pose. Resume starts from that pose. Navigation has a 220 ms hover-intent delay. A 20-second smootherstep cycle goes forward for 10 seconds and back for 10 seconds, with zero speed and acceleration at both ends; after three cycles it stops. Pause drift leaves pointer-look available. Reduced motion disables drift, pointer-look and automatic zoom. Below 760 px the route opens the existing vertical card view.

Foreground trees frame the viewport even when panning. They retain original image colours under refined masks. This is a visual prototype: sky and mountains remain one distant plate, water is static, the full central island/tree cutout is not finished, and reconstructed areas/edges need artwork review before production. It is multiplane zoom, not a physical dolly zoom.

Camera invariants:

```sh
node website/studies/motion/tests/camera.test.mjs
```

Validate GPU and CSS at the same paused pose, native wheel/drag interruption, navigation, reduced motion, mobile fallback and actual-device behaviour before replacing the main world. rAF timings are only local indicators, not proof of absence of GPU stalls or visual flicker.
