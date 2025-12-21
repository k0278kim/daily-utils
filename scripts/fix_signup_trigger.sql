-- 1. Relax constraints on profiles table to ensure no NOT NULL violations during signup
-- ID is Primary Key so it stays NOT NULL, but others should be nullable
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN nickname DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN avatar_url DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Redefine the trigger function with robustness
-- Added 'ON CONFLICT DO UPDATE' to prevent PK violations if profile already exists
-- Added 'SET search_path = public' for security definer safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, nickname, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    nickname = COALESCE(EXCLUDED.nickname, public.profiles.nickname),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = now();
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction, allowing the user to be created in auth.users
    -- This prevents the "Database error saving new user" block
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- 3. Ensure trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
