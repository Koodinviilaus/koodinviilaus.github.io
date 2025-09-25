# koodinviilaus.github.io

Vite + React + Three.js web app that renders a privacy-preserving 3D résumé. The production bundle never ships selectable résumé text—only the GLB geometry.

## Quick start

1. Install dependencies: `npm install`
2. Copy the example environment file: `cp .env.example .env`
3. (Optional) Point `VITE_RESUME_GLB_URL` at your own GLB if you are not using `public/resume.glb`
4. Launch the dev server: `npm run dev`

The home route (`#/`) and `#/resume` both load the interactive viewer. Drag to orbit, use a second touch point to pinch-zoom on mobile, or use the mouse wheel on desktop.

## Generating a résumé GLB locally (dev only)

While running the dev server, open `#/dev/GLB`:

- Pick a local PNG/JPG (defaults to `/.local/dev-resume.png` if present)
- The tool fixes EXIF orientation, runs Tesseract.js OCR line-by-line, samples average colours per line, extrudes text into meshes, and exports a single shared-material GLB
- Download the exported `resume.glb` and place it somewhere the production build can load (by default `public/resume.glb`)

## Environment configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_RESUME_GLB_URL` | Public URL of the résumé GLB loaded at runtime | `/resume.glb` |

When the variable is omitted the viewer falls back to the bundled `public/resume.glb`. Set it if you host the GLB elsewhere (still needs to be accessible from the built site).

## Testing & verification

- `npm run test` – runs unit tests (GLB exporter, colour sampler, text geometry, renderer) plus the post-build privacy scan
- `npm run build` – type-checks via `tsc -b` and builds the production bundle. Expect a Vite warning about bundle size from Three.js; investigate if it regresses further.

## Privacy guardrails

- The exporter clears text parameters and enforces a banned-string list (`resume`, `curriculum`, `vitae`)
- Tests scan the final `dist/` output to ensure no résumé strings leak into JavaScript or assets
- The viewer consumes only meshes/material metadata embedded inside the GLB

## Pointer & performance behaviour

- Pointer Events unify mouse and touch; pinch/drag/wheel are all handled in `ResumeRenderer`
- All line meshes reuse a single material to keep draw calls stable on mid-range mobile GPUs

## Tuning the experience (dev only)

- `src/features/resume3d/config.ts` exposes both pipeline and viewer constants (plane width, extrusion depth, lighting, rotation/zoom sensitivities, backdrop colours). Adjust values there to instantly refine layout and shading.
- `RESUME_PIPELINE_CONFIG` controls OCR placement math. For example, tweak `planeWidth`, `planePaddingRatio`, or `lineExtrudeDepth` to match your résumé proportions.
- `RESUME_VIEWER_CONFIG` handles renderer colours, lighting, pointer sensitivity, and zoom bounds so you can align with portfolio branding.

## Useful scripts

- `npm run dev` – run the Vite dev server
- `npm run lint` – run ESLint
- `npm run preview` – preview the production build locally
