-- 012_shared_links.sql
-- Tabla para dashboard compartido via link público

CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL DEFAULT 'Dashboard Compartido',
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id);

ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver/crear/eliminar sus propios links
CREATE POLICY "Users can manage own shared links"
  ON shared_links
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cualquiera puede leer un link activo por token (para pagina publica)
CREATE POLICY "Anyone can read active shared link by token"
  ON shared_links
  FOR SELECT
  USING (active = true)
  TO anon, authenticated;

CREATE TRIGGER set_updated_at_shared_links
  BEFORE UPDATE ON shared_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
