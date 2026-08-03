# Alerting and SLOs (step 37)

## Why this exists

Before this step, `/api/health` (step 29) could answer "is the worker
healthy?" but nothing ever asked it automatically — an outage was only
visible to someone who happened to load the URL. Once the pipeline is
carrying a real contractor's real bid documents, that gap means an outage
could run for hours undetected, right up until someone notices their
takeoff never finished — possibly on bid day. This step makes the check
self-triggering and makes an unhealthy state produce an actual page, not
just an endpoint someone could poll.

## SLOs

These are the concrete thresholds the system is held to — the same ones
`lib/health-check.ts` already enforces in code, stated explicitly here so
they can be reviewed/changed deliberately rather than only living as
magic numbers in one file:

| SLO | Threshold | Enforced by |
|---|---|---|
| Worker heartbeat freshness | ≤ 60s old (worker's own poll interval defaults to 5s — see step 36's `docs/LOAD-TEST.md` for the `POLL_INTERVAL_MS` bug found/fixed there) | `lib/health-check.ts` |
| Takeoff job queue staleness | No `takeoff_job` row sits in `queued`/`running` for more than 15 minutes | `lib/health-check.ts` |
| Time to first alert on an outage | ≤ 5 minutes after the worker/queue actually goes unhealthy (Vercel Cron cadence — see caveat below) | `vercel.json` + `app/api/cron/uptime-check` |
| Stripe webhook processing errors | Zero tolerated silently — every failure path already calls `logger.error` (→ Sentry) | `app/api/webhooks/stripe/route.ts` (step 31) |

## How alerting actually fires

```
Vercel Cron (every 5 min, vercel.json)
  → GET /api/cron/uptime-check
    → lib/health-check.ts's getHealthStatus() (same check /api/health exposes)
      → if degraded: Sentry.captureMessage(..., fingerprint: "uptime-check-degraded")
        → Sentry Alert Rule (one-time manual setup, below) → email / Slack / PagerDuty
```

The fingerprint is fixed, so every degraded tick for the same ongoing
outage groups into **one** Sentry issue instead of a new one every 5
minutes — an outage should read as one alert getting worse (event count
climbing), not a flood of separate pages. The issue needs a human to mark
it resolved once the underlying problem is fixed; it won't auto-resolve
just because the next check comes back healthy.

This deliberately reuses Sentry (already integrated, step 29) rather than
introducing a second monitoring vendor — "via Sentry" is enough to get a
real page without a new account. It has one real blind spot, covered next.

## What this doesn't cover — you still need one external monitor

The cron job only runs if Vercel itself is up and triggering it. If Vercel
has an outage, or DNS/the domain breaks, or the whole app is unreachable
for any reason, **the cron job can't fire either** — it can only detect
"the app is reachable but the worker/queue behind it isn't," not "the app
is gone." That case needs something outside Vercel entirely polling the
public URL.

Recommended: pick any free-tier uptime monitor (Better Uptime, UptimeRobot,
Checkly — none configured here, this is a 5-minute manual signup) and
point it at:

```
https://<your-app-domain>/api/health?token=<HEALTH_CHECK_TOKEN>
```

Most of these tools include a free public status page as part of the same
signup — worth turning on and linking from wherever contractors would look
during an outage (e.g. a footer link or a support email auto-reply), so
"is Constimator down right now" has an answer that doesn't require asking
you directly.

## One-time setup still needed (can't be done from here)

Both of these are dashboard actions on third-party SaaS UIs — no API
token for either is configured in this environment, so they need to be
done manually, once:

1. **Vercel**: set `CRON_SECRET` as a project environment variable (any
   random string) so `/api/cron/uptime-check` can verify the request
   actually came from Vercel's own cron trigger (see `.env.example`).
   Without it the route still works, just unauthenticated — fine for
   early days, worth locking down before this matters for real.

   **Cron frequency caveat**: `vercel.json` schedules this every 5 minutes
   (`*/5 * * * *`). Vercel's **Hobby plan only runs cron jobs once a day**
   regardless of the schedule string — the 5-minute cadence needs a Pro
   plan or higher. Check which plan the project is actually on; if it's
   still Hobby, either upgrade or treat the external monitor above as the
   primary alerting path until then (it isn't limited the same way).

2. **Sentry**: create one Alert Rule so the degraded-check issue actually
   notifies someone, instead of just accumulating silently in the Sentry
   dashboard:
   - Sentry project → Alerts → Create Alert → Issues
   - Conditions: "A new issue is created" (or, to also catch every
     recurrence: "The issue's event count is greater than 0 in 5 minutes")
   - Filter: tag `alert` equals `worker-down` (keeps this rule scoped to
     this one check, not every Sentry issue in the project)
   - Action: notify via email / Slack / PagerDuty (whichever the team
     actually watches — email-only is easy to miss on a weekend, worth
     picking something that reaches a phone if this is meant to catch a
     real bid-day outage)

## Known adjacent risk, not covered by this step

An org hitting its monthly AI spend cap (step 25) also stops a contractor
from processing new documents — same practical effect on a bid deadline as
an actual outage, but it's the rate limiter working as designed, not a
system failure, so it's out of scope for the SLOs above. Right now that
org sees an in-app error message on their next upload attempt
(`app/upload/actions.ts`) but nothing proactively notifies them (or you)
that it happened. Worth its own follow-up (e.g. an email to the org admin
the moment the cap is hit) if pilot contractors start running into it
close to a real bid date — noted here rather than built now, to keep this
step scoped to actual-outage alerting.
