-- This migration creates the trigger that automatically creates a user profile
-- when a new user signs up in the auth.users table.

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
