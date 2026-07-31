# Plan sets

This is the only file in `plan-sets/` that's tracked by git — everything
else here is your real job data and is gitignored on purpose.

## Adding a plan set

Create a subdirectory here, one per plan set:

```
plan-sets/
  shasta-county-24-118/
    plans.pdf                 <- any filename ending in .pdf
    known-quantities.json
```

`npm start` picks up every subdirectory automatically.

## known-quantities.json format

```json
{
  "projectName": "Shasta County Roadway Improvements (#24-118)",
  "pages": [4, 5, 6, 12],
  "items": [
    {
      "trade": "Grading",
      "description": "Roadway Excavation",
      "quantity": 8450,
      "unit": "CY",
      "notes": "Per C-101 through C-108 cross-sections"
    },
    {
      "trade": "Paving",
      "description": "HMA Type A",
      "quantity": 4850,
      "unit": "TON"
    }
  ]
}
```

- `pages` is optional — a list of 1-indexed sheet numbers to send to Claude.
  Omit it to send the whole PDF (capped at 20 pages — see
  `src/rasterize.ts`). Narrowing to the sheets that actually carry the
  quantities (grading plan, paving plan, utility plan, etc.) gives Claude a
  cleaner set to work from and keeps the request size down.
- `items` are *your* known-correct numbers, from bidding this job for real.
  Trade/description naming doesn't need to match whatever Claude comes up
  with — the script prints both lists separately, grouped by trade, so you
  compare by eye rather than relying on fuzzy auto-matching.
