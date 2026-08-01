-- Custom SQL migration file, put your code below! --

-- Without this, a fresh Supabase signup creates an auth.users row and
-- nothing else — there's no public.org/public.user row for them, so
-- getScopedDb() throws NoOrgMembershipError on their very first page load
-- (e.g. /dashboard), which isn't caught everywhere it's called. This trigger
-- auto-provisions a starter org (name/slug derived from their email, since
-- signup doesn't collect a company name yet) and makes the new user its
-- admin, so every signup lands with a working org from the start.
--
-- SECURITY DEFINER + a pinned search_path for the same reason as
-- current_org_id() above: it needs to write to public.org/public.user
-- despite running as the role that performs the auth.users insert
-- (supabase_auth_admin), which has no privileges on those tables itself.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
