-- Adiciona representante_mz à tabela applicants
-- Preenchido automaticamente via trigger no INSERT com o full_name do usuário autenticado

ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS representante_mz text;

-- Função que busca o nome do usuário na tabela profiles e preenche representante_mz
CREATE OR REPLACE FUNCTION public.set_representante_mz()
RETURNS TRIGGER AS $$
DECLARE
  v_name text;
BEGIN
  SELECT full_name INTO v_name
  FROM public.profiles
  WHERE id = auth.uid();

  NEW.representante_mz := COALESCE(v_name, 'Desconhecido');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: dispara antes de cada INSERT em applicants
DROP TRIGGER IF EXISTS trg_set_representante_mz ON public.applicants;
CREATE TRIGGER trg_set_representante_mz
  BEFORE INSERT ON public.applicants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_representante_mz();
