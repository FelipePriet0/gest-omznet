-- Garante que apenas o autor do parecer pode editá-lo ou excluí-lo.
-- Nenhum outro papel (gestor, analista, etc.) pode mexer no parecer de outro usuário.

begin;

create or replace function public.edit_parecer(
  p_card_id uuid,
  p_note_id uuid,
  p_text text,
  p_decision text default null
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row      public.kanban_cards;
  v_author   record;
  v_note     jsonb;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;

  -- Localizar o parecer e verificar autoria
  select elem
    into v_note
    from public.kanban_cards kc,
         jsonb_array_elements(coalesce(kc.reanalysis_notes, '[]'::jsonb)) elem
   where kc.id = p_card_id
     and (elem->>'id')::uuid = p_note_id
   limit 1;

  if v_note is null then
    raise exception 'not_found' using message = 'Parecer não encontrado.';
  end if;

  if (v_note->>'author_id')::uuid <> auth.uid() then
    raise exception 'not_author' using message = 'Você só pode editar seus próprios pareceres.';
  end if;

  select id as author_id, coalesce(full_name, '') as author_name
    from public.profiles
   where id = auth.uid()
    into v_author;

  update public.kanban_cards kc
     set reanalysis_notes = (
           select jsonb_agg(
             case when (elem->>'id')::uuid = p_note_id then
               elem || jsonb_build_object(
                 'text',            p_text,
                 'decision',        p_decision,
                 'updated_by_id',   v_author.author_id,
                 'updated_by_name', v_author.author_name,
                 'updated_at',      now()
               )
             else elem end
           )
           from jsonb_array_elements(coalesce(kc.reanalysis_notes, '[]'::jsonb)) elem
         ),
         updated_at = now()
   where kc.id = p_card_id
   returning * into v_row;

  if not found then
    raise exception 'not_found' using message = 'Card não encontrado.';
  end if;

  return v_row;
end;$$;


create or replace function public.delete_parecer(
  p_card_id uuid,
  p_note_id uuid
)
returns public.kanban_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  public.kanban_cards;
  v_note jsonb;
begin
  if not public.can_user_manage_card(p_card_id) then
    raise exception 'not_allowed' using message = 'Sem permissão.';
  end if;

  -- Localizar o parecer e verificar autoria
  select elem
    into v_note
    from public.kanban_cards kc,
         jsonb_array_elements(coalesce(kc.reanalysis_notes, '[]'::jsonb)) elem
   where kc.id = p_card_id
     and (elem->>'id')::uuid = p_note_id
   limit 1;

  if v_note is null then
    raise exception 'not_found' using message = 'Parecer não encontrado.';
  end if;

  if (v_note->>'author_id')::uuid <> auth.uid() then
    raise exception 'not_author' using message = 'Você só pode excluir seus próprios pareceres.';
  end if;

  update public.kanban_cards kc
     set reanalysis_notes = (
           select jsonb_agg(
             case when (elem->>'id')::uuid = p_note_id then
               elem || jsonb_build_object('deleted', true, 'updated_at', now())
             else elem end
           )
           from jsonb_array_elements(coalesce(kc.reanalysis_notes, '[]'::jsonb)) elem
         ),
         updated_at = now()
   where kc.id = p_card_id
   returning * into v_row;

  return v_row;
end;$$;

commit;
