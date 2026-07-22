-- REPARAR trigger de registro de usuarios
-- Pegar en SQL Editor y ejecutar

-- 1. Recrear funcion con ruta explicita
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END $func$;

-- 2. Recrear trigger que se activa al crear usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Verificar que funcion + trigger esten correctos
SELECT 'OK' AS resultado
WHERE EXISTS (
  SELECT 1 FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE t.tgname = 'on_auth_user_created'
    AND p.proname = 'handle_new_user'
);
