# AGENTS.md — CalculadoraVectores

## Quick start
- No build step, no dev server. Open `index.html` directly in a browser.
- `package.json` is present but only sets `"type": "module"`; no dependencies, no real `test` script.

## Architecture
- **Vanilla JS (ES modules)**, no framework, no bundler, no TypeScript.
- Two source files under `src/`:
  - `vector.js` — `Vector` class (default export)
  - `algebra.js` — vector operation functions (named exports), loaded by `index.html`
- Single CSS file: `estilo-calculadora-vectores.css` (dark theme, uses CSS nesting — requires modern browser).

## Code conventions
- Function/variable names are **Spanglish**: `sumaVectores`, `productoPunto`, `anguloVectores`, `getDimensiones`. Comments and UI are in Spanish.
- `src/algebra.js` contains both exported functions AND inline test/demo code (lines ~80–121) that runs on import and logs results to console.
- Precision helper `redondeoPresicion` exists in both files (duplicated) and has a likely parenthesis bug — the divide-by-100000000 is inside `Math.round()`.

## Known bugs worth fixing
- `Vector.producoEscalar` — typo in method name (`produco` instead of `producto`) and it returns the raw array instead of a `Vector` instance.
  impacted in turn by the `producoEscalar` bug — call chain: `producoEscalar` → `proyeccion`.
- `redondeoPresicion` formula: `Math.round((n + Number.EPSILON) * 100000000 / 100000000)` should be `Math.round((n + Number.EPSILON) * 100000000) / 100000000`.

## Testing
- There are no tests. The test script in `package.json` is the npm default placeholder.
- Verification is manual: open `index.html` in a browser and check the browser console for the demo output from `algebra.js`.

## No git
- This repo is not yet initialized with git. No `.gitignore` exists — create one before committing to exclude `node_modules/`, `.atl/` cache files, and OS artifacts.
