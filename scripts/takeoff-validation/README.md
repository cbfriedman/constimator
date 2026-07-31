# Takeoff validation (standalone — not part of the app)

Feasibility check: can Claude vision extract accurate quantities from real
civil/roadway plan sheets? Rasterizes each plan set, sends every sheet to
Claude, and prints what it extracted next to your own known-correct numbers
so you can compare by hand.

This is deliberately **not** wired into the Constimator app, has its own
`package.json`/`node_modules` (npm, not the app's pnpm workspace — see the
root repo's history for why that separation was worth keeping explicit),
and its results don't change any product scope decision on their own. See
`docs/DECISIONS.md` in the main repo for the current (unchanged) Product
wedge decision this is validating an assumption *around*, not superseding.

## Setup

```sh
cd scripts/takeoff-validation
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY in .env
```

Then add your plan sets — see `plan-sets/README.md`.

## Run

```sh
npm start
```

For each plan set found under `plan-sets/`, this prints two tables side by
side in the terminal: your known-correct quantities, and what Claude
extracted (with Claude's own confidence score per item, and a callout for
anything under 60%). Nothing is auto-matched or scored — the whole point is
for you to eyeball the two lists per trade and judge accuracy yourself.

## What this isn't

- Not a takeoff feature in the product. Nothing here writes to the app's
  database or gets called from the Next.js app.
- Not a decision. It's an input to one — see docs/DECISIONS.md.
