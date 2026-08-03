-- Custom SQL migration file, put your code below! --

-- Step 32: extends step 3's handle_new_user() trigger. Previously every
-- new auth.users row unconditionally got a fresh solo org — correct for
-- an organic signup, wrong for someone accepting a teammate invite (see
-- app/team/actions.ts's inviteTeammateAction, which calls Supabase Auth's
-- admin.inviteUserByEmail with orgId/role/inviteId in the `data` option —
-- that becomes this new row's raw_user_meta_data). If that metadata is
-- present, join the inviting org with the invited role instead of
-- provisioning a new one, and mark the invite row accepted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  invited_org_id uuid;
  invited_role public.user_role;
  invited_invite_id uuid;
BEGIN
  invited_org_id := (NEW.raw_user_meta_data->>'orgId')::uuid;

  IF invited_org_id IS NOT NULL THEN
    invited_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'estimator');
    invited_invite_id := (NEW.raw_user_meta_data->>'inviteId')::uuid;

    INSERT INTO public.user (id, org_id, role, email)
    VALUES (NEW.id, invited_org_id, invited_role, NEW.email);

    IF invited_invite_id IS NOT NULL THEN
      UPDATE public.invite
      SET status = 'accepted', updated_at = now()
      WHERE id = invited_invite_id;
    END IF;

    RETURN NEW;
  END IF;

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
$$;
