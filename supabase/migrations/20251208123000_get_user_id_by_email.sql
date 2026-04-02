-- Secure function to look up user ID by email (only callable by service role)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = $1;
  RETURN uid;
END;
$$;

-- Revoke execute from public/anon/authenticated to ensure only service role (admin) can call it
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM authenticated;
-- Grant to service_role
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
