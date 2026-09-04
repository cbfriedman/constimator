# Pilot checklist — run one real bid through Constimator

For 2–3 contractors, each running **one real bid they're actually
preparing** (not a demo project) through the app, end to end. Goal: find
out whether the core workflow holds up on a real job, and whether any
number the app shows is one they wouldn't trust enough to put their name
on.

## Scope — what this pilot tests

**In scope** (real, working, backed by the database):
- Uploading bid documents to a project
- Entering the official bid form's line items by hand, or importing AI-extracted bid-form items after review
- Building your own estimate by hand (`Estimate Workspace` — add/edit/duplicate/delete line items)
- Importing estimate lines from the official bid schedule
- Reconciliation: comparing your estimate against the official bid form
- Cost Setup: your company's default labor/equipment rates and markup
- Reports: exporting estimate, reconciliation, cost, quantity, and proposal summaries
- Switching between projects (sidebar switcher, dashboard, and project cards)

**Out of scope for this pilot** — don't test these yet, they're not ready:
- Anything involving AI reading quantities off plan/drawing sheets
  (`Upload Documents` will accept a plan set and queue it, but the
  extraction behind it hasn't been run against real data end to end yet
  — don't rely on it populating your estimate for this round)
- Human Review as a full reviewer desk (you can submit a request; there
  is no in-app assignment/resolution workflow yet)

If a contractor gets curious and tries the AI plan-takeoff path anyway, that's
fine — just flag whatever it does (or doesn't do) using the feedback
template. Just don't plan the pilot around it working.

## Before they start

Ask each contractor to have on hand:
- **A real bid they're currently preparing** — ideally one with an
  official bid form (unit-price schedule) with at least 15–20 line
  items, so reconciliation has something real to check.
- Their own company's labor/equipment rates and markup, if they want
  Cost Setup to reflect reality (optional — they can skip this and note
  it as a limitation instead).
- About 60–90 minutes, ideally uninterrupted.

## Steps

1. **Sign up** at the app URL → creates their own company account.
2. **Create a project** (`Projects` → `New Project`) for the real job:
   name, number, bid date, engineer's estimate if known, location, type.
3. **Upload the official bid form** (and any other bid documents they
   want on file) under `Upload Documents`.
4. **Cost Setup**: fill in (or skim past) company default rates and
   markup. Note anything that doesn't match how they actually price work.
5. **Enter the official bid form's line items** under `Bid
   Reconciliation` — item #, description, unit, official quantity, spec
   section, one row per bid item. If you uploaded the bid form and
   extraction finished, review the extracted items and import them
   instead of typing.
6. **Build their estimate** under `Estimate Workspace` — add a line item
   per bid item with their own quantity, unit price, and (optionally)
   labor/material/equipment/sub breakdown. This is the real work: their
   own numbers, not the app's.
7. **Check reconciliation** — go back to `Bid Reconciliation` and review
   the diff. For each flagged item (missing, quantity discrepancy, unit
   mismatch), have them judge: *is this flag right, and is it useful?*
8. **Generate a report** under `Reports` and have them look it over as
   if they were about to hand it to someone.
9. **Fill out the feedback template** (see
   [PILOT_FEEDBACK_TEMPLATE.md](PILOT_FEEDBACK_TEMPLATE.md)) — especially
   the "numbers I wouldn't submit" section.

## What "done" looks like

- They got through their real bid form and a real estimate without
  getting stuck on a missing feature (as opposed to a bug — missing
  features in the "out of scope" list above are expected right now).
- Reconciliation produced a diff they'd actually find useful on a real
  bid day, or clear notes on why it wouldn't.
- At least one filled-out feedback template per contractor, even if
  everything went fine — "nothing to flag" is a useful data point too.

## Collecting results

Send each contractor [PILOT_FEEDBACK_TEMPLATE.md](PILOT_FEEDBACK_TEMPLATE.md)
before they start (so they can jot things down as they go rather than
trying to remember afterward), and have them send the filled-out copy
back when done.
