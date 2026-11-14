# Immersive World — isolated composition study

Open `/world/`. The original site remains unchanged at `/`.

This is a single flat panoramic plane with transparent architectural hit regions, subtle hover/focus labels, native section dialogs, and a persistent alternative navigation. There are no new images, 3D dependencies, false parallax, or layered depth effects. Existing Day / Sunset / Night assets and canonical content from `../scene.js` are reused.

The 1672 × 435 landscape crop has an aspect ratio of 3.84:1. Filling most of a conventional viewport without distortion requires cropping horizontally. Visitors can drag (mouse), swipe (touch), scroll horizontally, use the arrows, or open all five spaces from the persistent text links. Keyboard focus brings hidden landmarks into view. A brief section preview is all that opens today; cinematic camera entry and immersive interiors are future work.

Future layers must share the same source coordinates and aligned master art. Current images are flattened concepts, not production-ready 2.5D layers. The architecture and landmark regions are defined in one scene plane; separate sky, river, bridge and architecture art can later share that plane without changing navigation IDs.

No automatic motion. Illumination crossfades and pan-button scrolling respect reduced-motion. Asset resolution limits are visible when the landscape is enlarged; no invented detail or regenerated artwork has been substituted.

Viewport layout: the page uses a grid sized to the viewport. The navigation and footer reserve their natural space; the scene fills the remainder. ResizeObserver measures this scene area and sizes the source plane at its original aspect ratio, preserving the camera center. There is no 480px cap or unused fixed-height band. Image resolution remains limited by the original master; layout changes do not create new artwork detail. Functional titles lead in tooltips and navigation; poetic place names are secondary. Text selection has an explicit contrasting foreground.

Desktop pointer hover over the bottom navigation pans to the matching landmark after a 140ms intent delay. Keyboard focus does the same; reduced-motion uses instant positioning. The surrounding scene fades toward the current background by 58%, using hand-defined, softly edged silhouette masks in source coordinates. These masks are approximate art-directed regions, not extracted production layers; the source raster is unchanged. Leaving the navigation/landmark restores the scene. Touch does not activate hover-driven camera motion.

Camera focus separates pan and zoom. Horizontal framing uses a critically damped motion with continuous velocity across target changes, capped at 0.4 viewport widths/second and 0.85 viewport widths/second². Zoom-in lasts five seconds with a zero-velocity start and an exponential tail (~69% completed after one second); zoom-out keeps its previously reviewed 2.2-second quintic curve. Reduced-motion disables zoom and performs instant framing.

Silhouette paths were tightened against a source-coordinate grid; bridge arches have cut-outs and edges feather by 4 source pixels. These are still hand-defined masks, not extracted artwork layers. Passage has no scene hotspot or camera target while no tunnel exists in the panorama; its text navigation still opens About. The scene footer labels have been removed.

Genesis prototype: black → vector wordmark → small original vessel → scene fade.
The wordmark shrinks and rises above the vessel. The world waits for a vessel
click or Skip intro; there is no automatic transition. Escape skips. The beginning replays it. Deep links
bypass the introduction; reduced motion shortens timings. No explosion yet.

At viewport widths up to 760px, /world/ redirects to the standard card version, preserving section hashes. Resizing to a compact viewport does the same. The immersive introduction currently belongs to desktop only.

Manual camera input has priority: native wheel (including horizontal inertia),
mouse drag, touch start and keyboard scrolling cancel all pending hover camera
motion and timers. Position and current magnification are retained. Hover following
stays disarmed after release until a fresh physical pointer displacement followed
by a new entry, or explicit keyboard focus. Scenery moving underneath a stationary
pointer does not count as new intent.
