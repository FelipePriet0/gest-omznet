-- Correção: Atualizar trigger de comment_reply e garantir que applicant_id seja buscado corretamente
-- Problema: O trigger não estava sendo criado na migration 0020 e o applicant_id não era buscado corretamente

begin;

-- 1) Atualizar função inbox_notify_comment_replies para buscar applicant_id corretamente
do $$ begin
  create or replace function public.inbox_notify_comment_replies()
  returns trigger as $fn$
  declare
    v_parent record;
    v_area text;
    v_url text;
    v_author text;
    v_snap text;
    v_applicant_id uuid;
    v_person_type text;
  begin
    if new.parent_id is null or new.deleted_at is not null then
      return new;
    end if;

    -- Buscar dados do comentário pai e do card (incluindo applicant_id e person_type)
    select 
      c.author_id, 
      kc.area,
      new.author_name as author_name
    into v_parent
    from public.card_comments c
    join public.kanban_cards kc on kc.id = new.card_id
    where c.id = new.parent_id;

    -- Buscar applicant_id e person_type separadamente
    select 
      kc.applicant_id,
      a.person_type::text
    into v_applicant_id, v_person_type
    from public.kanban_cards kc
    left join public.applicants a on a.id = kc.applicant_id
    where kc.id = new.card_id;

    -- Se não encontrou o parent, não cria notificação
    if v_parent.author_id is null then
      return new;
    end if;

    -- Se não encontrou applicant_id, não cria notificação (card sem ficha)
    if v_applicant_id is null then
      return new;
    end if;

    -- Só cria notificação se o autor do pai é diferente do autor do novo comentário
    if v_parent.author_id <> new.author_id then
      v_area := coalesce(v_parent.area, 'analise');
      
      -- Gerar link_url correto baseado em person_type
      if v_person_type = 'PJ' then
        v_url := '/cadastro/pj/' || v_applicant_id::text || '?card=' || new.card_id::text || '&from=analisar';
      else
        v_url := '/cadastro/pf/' || v_applicant_id::text || '?card=' || new.card_id::text || '&from=analisar';
      end if;
      
      -- Buscar author_name do perfil se não estiver no comentário
      if v_parent.author_name is null or v_parent.author_name = '' then
        select coalesce(p.full_name, '') into v_author
        from public.profiles p
        where p.id = new.author_id;
      else
        v_author := v_parent.author_name;
      end if;
      
      v_snap := left(coalesce(new.content,''), 600);

      insert into public.inbox_notifications(
        user_id, type, priority,
        comment_id, card_id, applicant_id, link_url, meta, content
      ) values (
        v_parent.author_id,
        'comment_reply',
        'high',
        new.id,
        new.card_id,
        v_applicant_id,
        v_url,
        jsonb_build_object('author_name', v_author),
        v_snap
      );
    end if;

    return new;
  end;
  $fn$ language plpgsql;
exception when others then null; end $$;

-- 2) Garantir que o trigger está criado e ativo
do $$ begin
  drop trigger if exists trg_inbox_comment_replies on public.card_comments;
  create trigger trg_inbox_comment_replies
  after insert on public.card_comments
  for each row execute function public.inbox_notify_comment_replies();
exception when others then null; end $$;

commit;

