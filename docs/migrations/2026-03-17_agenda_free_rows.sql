-- ============================================================
-- Linhas Livres da Agenda (Overbooking / Buffer)
-- Cada registro representa uma linha sem técnico associado
-- para um dia específico. Cards sem technician_id aparecem
-- distribuídos nessas linhas por hora_at.
-- ============================================================

CREATE TABLE IF NOT EXISTS agenda_free_rows (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date          date NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- Índice para busca rápida por data
CREATE INDEX IF NOT EXISTS idx_agenda_free_rows_date
  ON agenda_free_rows (date)
  WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE agenda_free_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_free_rows"
  ON agenda_free_rows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_free_rows"
  ON agenda_free_rows FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_free_rows"
  ON agenda_free_rows FOR UPDATE TO authenticated
  USING (true);

-- ────────────────────────────────────────────────────────────
-- RPC: add_free_row(p_date date) → uuid
-- Insere uma nova linha livre para o dia, com display_order
-- igual ao maior existente + 1.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION add_free_row(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order integer;
  v_id    uuid;
BEGIN
  SELECT COALESCE(MAX(display_order), 0) + 1
    INTO v_order
    FROM agenda_free_rows
   WHERE date = p_date
     AND deleted_at IS NULL;

  INSERT INTO agenda_free_rows (date, display_order)
  VALUES (p_date, v_order)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: delete_free_row(p_id uuid)
-- Soft-delete de uma linha livre.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_free_row(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agenda_free_rows
     SET deleted_at = now()
   WHERE id = p_id;
END;
$$;
