-- Custom SQL migration file, put your code below! --

-- SECURITY FIX — replaces step 32's handle_new_user() (migration 0008).
--
-- 0008 read the joining org and role straight out of the new auth.users
-- row's raw_user_meta_data:
--
--   invited_org_id := (NEW.raw_user_meta_data->>'orgId')::uuid;
--   invited_role   := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'estimator');
--
-- raw_user_meta_data is populated verbatim from the `data` field of a GoTrue
-- signup request. Our own inviteTeammateAction sets it server-side, but the
-- trigger cannot tell that apart from a hand-rolled request: the anon key is
-- public by design, so anyone could POST to /auth/v1/signup with
-- data: {"orgId": "<someone else's org>", "role": "admin"} and the trigger
-- would write exactly that membership row — before email confirmation, since
-- this fires AFTER INSERT ON auth.users.
--
-- That defeated the whole isolation design rather than merely bypassing part
-- of it. getScopedDb() derives the tenant from public.user.org_id, so once an
-- attacker writes that row themselves, every orgScoped() helper, every
-- assertProjectInOrg() check and every RLS policy keys off the poisoned value
-- and works correctly on the attacker's behalf. It did not even require
-- guessing an org UUID: an invited teammate's own orgId is in their
-- raw_user_meta_data, which Supabase hands to the browser as
-- user.user_metadata, so any viewer/estimator could re-sign-up as an admin of
-- their own employer's org.
--
-- The fix is to stop reading the request at all. public.invite is created
-- server-side by inviteTeammateAction (behind requireAdmin) *before* it calls
-- admin.inviteUserByEmail, so by the time this trigger runs there is already a
-- pending invite row carrying the authoritative org_id and role. We look that
-- row up by the new user's own email — which GoTrue has verified is the
-- address being registered — and take org_id and role from it.
--
-- raw_user_meta_data is now ignored entirely. It is still set by
-- inviteTeammateAction (harmless, and useful for debugging), but nothing
-- security-relevant reads it. Reading the invite row is also strictly more
-- correct than reading the metadata: an admin who changes the role on a
-- resend updates the invite row, and this now honours that.
--
-- Attack outcomes after this change:
--   * signup with a forged orgId/role and no invite  -> falls through to the
--     organic path and gets a fresh solo org, exactly like any other signup
--   * signup with a forged role by someone genuinely invited as 'viewer'
--     -> joins as 'viewer', because the role comes from the invite row
--   * signup with someone else's email to claim their invite -> GoTrue
--     rejects it; inviteUserByEmail already created that auth.users row
--
-- Matching is case-insensitive on both sides. inviteTeammateAction lowercases
-- the address before storing it, and GoTrue normalises too, but an invite row
-- written before that normalisation existed would otherwise silently miss and
-- drop the invitee into their own solo org.
--
-- No FOR UPDATE on the lookup: auth.users.email is unique, so two signups for
-- the same address cannot race here, and the UPDATE below re-checks status.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  matched_invite_id uuid;
  matched_org_id uuid;
  matched_role public.user_role;
BEGIN
  -- Newest pending invite for this address wins. Two orgs inviting the same
  -- person is possible (the invite table has no unique constraint on email),
  -- and the most recent invitation is the one the person is acting on.
  SELECT id, org_id, role
    INTO matched_invite_id, matched_org_id, matched_role
  FROM public.invite
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite_id IS NOT NULL THEN
    INSERT INTO public.user (id, org_id, role, email)
    VALUES (NEW.id, matched_org_id, matched_role, NEW.email);

    -- Only the invite we actually consumed. Any other pending invites for
    -- this address stay pending and are visible to the admins who sent
    -- them, rather than being silently marked accepted by an org join the
    -- invitee never made.
    UPDATE public.invite
    SET status = 'accepted', updated_at = now()
    WHERE id = matched_invite_id
      AND status = 'pending';

    RETURN NEW;
  END IF;

  -- Organic signup — unchanged from migration 0003. No invite, so this is
  -- someone signing up for themselves: give them their own org as admin.
  INSERT INTO public.org (name, slug)
  VALUES (
    initcap(split_part(NEW.email, '@', 1)) || '''s Company',
    lower(split_part(NEW.email, '@', 1)) || '-' || substr(NEW.id::text, 1, 8)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.user (id, org_id, role, email)
  VALUES (NEW.id, new_org_id, 'admin', NEW.email);

  RETURN NEW;
END;
$$;--> statement-breakpoint

-- No new index for the lookup. It would have to be on lower(email), which
-- drizzle-kit cannot express in db/schema.ts, so it would show up as drift on
-- the next `pnpm db:generate` — the exact failure mode this codebase already
-- has enough of. The existing invite_email_idx narrows the scan, the invite
-- table is small, and this runs once per signup.

-- The trigger itself is unchanged (still AFTER INSERT ON auth.users calling
-- public.handle_new_user), so it is recreated only to keep this migration
-- self-contained if 0003/0008 were ever squashed away.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
