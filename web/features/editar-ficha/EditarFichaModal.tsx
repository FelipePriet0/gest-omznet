"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Conversation } from "@/features/comments/Conversation";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import { AttachmentsModal } from "@/features/attachments/AttachmentsModal";
import { changeStage } from "@/features/kanban/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";

type AppModel = {
  primary_name?: string; cpf_cnpj?: string; phone?: string; whatsapp?: string; email?: string;
  address_line?: string; address_number?: string; address_complement?: string; cep?: string; bairro?: string;
  plano_acesso?: string; venc?: string | number | null; carne_impresso?: boolean; sva_avulso?: string;
};

// Dropdown contents (mesmos do Expanded)
const PLANO_OPTIONS: ({label:string,value:string,disabled?:boolean})[] = [
  { label: '— Normais —', value: '__hdr_norm', disabled: true },
  { label: '100 Mega - R$ 59,90', value: '100 Mega - R$ 59,90' },
  { label: '250 Mega - R$ 69,90', value: '250 Mega - R$ 69,90' },
  { label: '500 Mega - R$ 79,90', value: '500 Mega - R$ 79,90' },
  { label: '1000 Mega (1Gb) - R$ 99,90', value: '1000 Mega (1Gb) - R$ 99,90' },
  { label: '— IP Dinâmico —', value: '__hdr_ipdin', disabled: true },
  { label: '100 Mega + IP Dinâmico - R$ 74,90', value: '100 Mega + IP Dinâmico - R$ 74,90' },
  { label: '250 Mega + IP Dinâmico - R$ 89,90', value: '250 Mega + IP Dinâmico - R$ 89,90' },
  { label: '500 Mega + IP Dinâmico - R$ 94,90', value: '500 Mega + IP Dinâmico - R$ 94,90' },
  { label: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90', value: '1000 Mega (1Gb) + IP Dinâmico - R$ 114,90' },
  { label: '— IP Fixo —', value: '__hdr_ipfixo', disabled: true },
  { label: '100 Mega + IP Fixo - R$ 259,90', value: '100 Mega + IP Fixo - R$ 259,90' },
  { label: '250 Mega + IP Fixo - R$ 269,90', value: '250 Mega + IP Fixo - R$ 269,90' },
  { label: '500 Mega + IP Fixo - R$ 279,90', value: '500 Mega + IP Fixo - R$ 279,90' },
  { label: '1000 Mega (1Gb) + IP Fixo - R$ 299,90', value: '1000 Mega (1Gb) + IP Fixo - R$ 299,90' },
];

const SVA_OPTIONS: ({label:string,value:string,disabled?:boolean})[] = [
  { label: '— Streaming e TV —', value: '__hdr_stream', disabled: true },
  { label: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)', value: 'MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)' },
  { label: 'DEZZER: R$ 15,00', value: 'DEZZER: R$ 15,00' },
  { label: 'MZ CINE-PLAY: R$ 19,90', value: 'MZ CINE-PLAY: R$ 19,90' },
  { label: '— Hardware e Equipamentos —', value: '__hdr_hw', disabled: true },
  { label: 'SETUP BOX MZNET: R$ 100,00', value: 'SETUP BOX MZNET: R$ 100,00' },
  { label: '— Wi‑Fi Extend — Sem fio —', value: '__hdr_wifi_sf', disabled: true },
  { label: '01 WI‑FI EXTEND (SEM FIO): R$ 25,90', value: '01 WI‑FI EXTEND (SEM FIO): R$ 25,90' },
  { label: '02 WI‑FI EXTEND (SEM FIO): R$ 49,90', value: '02 WI‑FI EXTEND (SEM FIO): R$ 49,90' },
  { label: '03 WI‑FI EXTEND (SEM FIO): R$ 74,90', value: '03 WI‑FI EXTEND (SEM FIO): R$ 74,90' },
  { label: '— Wi‑Fi Extend — Cabo —', value: '__hdr_wifi_cab', disabled: true },
  { label: '01 WI‑FI EXTEND (CABEADO): R$ 35,90', value: '01 WI‑FI EXTEND (CABEADO): R$ 35,90' },
  { label: '02 WI‑FI EXTEND (CABEADO): R$ 69,90', value: '02 WI‑FI EXTEND (CABEADO): R$ 69,90' },
  { label: '03 WI‑FI EXTEND (CABEADO): R$ 100,00', value: '03 WI‑FI EXTEND (CABEADO): R$ 100,00' },
];

const VENC_OPTIONS = ["5","10","15","20","25"] as const;

export function EditarFichaModal({ open, onClose, cardId, applicantId }: { open: boolean; onClose: () => void; cardId: string; applicantId: string; }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [dueAt, setDueAt] = useState<string>("");
  const [horaAt, setHoraAt] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [pareceres, setPareceres] = useState<string[]>([]);
  const [novoParecer, setNovoParecer] = useState<string>("");
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const [personType, setPersonType] = useState<'PF'|'PJ'|null>(null);
  // UI: tarefas/anexos em conversas
  const [taskOpen, setTaskOpen] = useState<{open:boolean, parentId?: string|null, taskId?: string|null, source?: 'parecer'|'conversa'}>({open:false});
  const [attachOpen, setAttachOpen] = useState<{open:boolean, parentId?: string|null, source?: 'parecer'|'conversa'}>({open:false});

  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingCard = useRef<any>({});

  useEffect(() => {
    if (!open) return;
    let active = true;
    let chApp: any; let chCard: any;
    (async () => {
      try {
        setLoading(true);
        const { data: a } = await supabase
          .from('applicants')
          .select('primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, person_type')
          .eq('id', applicantId)
          .single();
        const { data: c } = await supabase
          .from('kanban_cards')
          .select('created_at, due_at, hora_at, reanalysis_notes')
          .eq('id', cardId)
          .single();
        if (!active) return;
        const a2:any = { ...(a||{}) };
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        setApp(a2||{});
        setPersonType((a as any)?.person_type ?? null);
        setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
        setDueAt(c?.due_at ? new Date(c.due_at).toISOString().slice(0,10) : "");
        setHoraAt(c?.hora_at ? String(c.hora_at).slice(0,5) : "");
        setPareceres(Array.isArray(c?.reanalysis_notes) ? c!.reanalysis_notes as any : []);

        // Realtime: applicants (payload.new) and kanban_cards
        chApp = supabase
          .channel(`rt-edit-app-${applicantId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applicants', filter: `id=eq.${applicantId}` }, (payload: any) => {
            const row:any = payload.new || {};
            const a3:any = { ...app };
            ['primary_name','cpf_cnpj','phone','whatsapp','email','address_line','address_number','address_complement','cep','bairro','plano_acesso','sva_avulso','carne_impresso','venc','person_type'].forEach((k)=>{
              if (k in row) (a3 as any)[k] = row[k];
            });
            if (typeof a3.venc !== 'undefined' && a3.venc !== null) a3.venc = String(a3.venc);
            setApp(a3);
            if (row.person_type) setPersonType(row.person_type);
          })
          .subscribe();

        chCard = supabase
          .channel(`rt-edit-card-${cardId}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_cards', filter: `id=eq.${cardId}` }, (payload: any) => {
            const row:any = payload.new || {};
            if (row.due_at) setDueAt(new Date(row.due_at).toISOString().slice(0,10));
            if (row.hora_at) setHoraAt(String(row.hora_at).slice(0,5));
            if (Array.isArray(row.reanalysis_notes)) setPareceres(row.reanalysis_notes);
          })
          .subscribe();
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // cleanup channels on close/unmount
  }, [open, cardId, applicantId]);

  useEffect(() => {
    if (!open) return;
    const channels = supabase.getChannels?.() || [];
    return () => { try { channels.forEach((c:any)=> supabase.removeChannel(c)); } catch {} };
  }, [open, cardId, applicantId]);

  // Listeners para abrir Task/Anexo a partir dos inputs de Parecer (respostas)
  useEffect(() => {
    (window as any).mz_card_id = cardId;
    function onOpenTask() { setTaskOpen({ open: true, parentId: null, taskId: null }); }
    function onOpenAttach() { setAttachOpen({ open: true, parentId: null }); }
    window.addEventListener('mz-open-task', onOpenTask);
    window.addEventListener('mz-open-attach', onOpenAttach);
    return () => {
      window.removeEventListener('mz-open-task', onOpenTask);
      window.removeEventListener('mz-open-attach', onOpenAttach);
    };
  }, []);

  async function flush() {
    if (!open) return;
    const ap = pendingApp.current; const cp = pendingCard.current;
    pendingApp.current = {}; pendingCard.current = {};
    if (Object.keys(ap).length === 0 && Object.keys(cp).length === 0) return;
    setSaving('saving');
    try {
      if (Object.keys(ap).length > 0) {
        const patch:any = { ...ap };
        if (typeof patch.venc !== 'undefined') { const n = parseInt(String(patch.venc),10); patch.venc = Number.isFinite(n) ? n : null; }
        await supabase.from('applicants').update(patch).eq('id', applicantId);
      }
      if (Object.keys(cp).length > 0) {
        await supabase.from('kanban_cards').update(cp).eq('id', cardId);
      }
      setSaving('saved'); setTimeout(()=> setSaving('idle'), 1000);
    } catch { setSaving('error'); }
  }

  function queue(scope:'app'|'card', key:string, value:any) {
    if (scope==='app') pendingApp.current = { ...pendingApp.current, [key]: value };
    else pendingCard.current = { ...pendingCard.current, [key]: value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  }

  async function addParecer() {
    const txt = novoParecer.trim();
    if (!txt) return;
    setNovoParecer('');
    try {
      await supabase.rpc('add_parecer', { p_card_id: cardId, p_text: txt, p_parent_id: null });
      // Realtime vai atualizar a lista
    } catch {}
  }

  const horarios = ["08:30","10:30","13:30","15:30"];
  const statusText = useMemo(()=> saving==='saving'? 'Salvando…' : saving==='saved'? 'Salvo' : saving==='error'? 'Erro ao salvar' : '', [saving]);

  // Helpers de máscara (sem restringir a entrada de texto)
  function digitsOnly(s: string) { return (s || '').replace(/\D+/g, ''); }
  function formatCpf(d: string) {
    d = digitsOnly(d).slice(0,11);
    const p1=d.slice(0,3), p2=d.slice(3,6), p3=d.slice(6,9), p4=d.slice(9,11);
    let out=p1; if (p2) out += '.'+p2; if (p3) out += '.'+p3; if (p4) out += '-'+p4; return out;
  }
  function formatCnpj(d: string) {
    d = digitsOnly(d).slice(0,14);
    const p1=d.slice(0,2), p2=d.slice(2,5), p3=d.slice(5,8), p4=d.slice(8,12), p5=d.slice(12,14);
    let out=p1; if (p2) out += '.'+p2; if (p3) out += '.'+p3; if (p4) out += '/'+p4; if (p5) out += '-'+p5; return out;
  }
  function formatCpfCnpj(input: string) {
    const d = digitsOnly(input);
    if (d.length <= 11) return formatCpf(d);
    return formatCnpj(d);
  }
  // Para telefone/whatsapp: aplica máscara se não houver letras; se tiver texto, mantém
  function maskPhoneLoose(input: string) {
    if (/[A-Za-z]/.test(input)) return input; // permitir texto livre
    const d = digitsOnly(input).slice(0,11);
    const len = d.length; const ddd = d.slice(0,2);
    if (len <= 2) return d;
    if (len <= 6) return `(${ddd}) ${d.slice(2)}`;
    if (len <= 10) return `(${ddd}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${ddd}) ${d.slice(2,7)}-${d.slice(7)}`;
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[96vw] sm:w-[95vw] max-w-[980px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white shadow-2xl" style={{ borderRadius: '28px' }}>
        <div className="p-6">
        <div className="mb-6">
          <div className="header-editar-ficha">
            <div className="header-content">
              <div className="flex items-center gap-3">
                <Image
                  src="/mznet-logo.png"
                  alt="MZNET Logo"
                  width={36}
                  height={36}
                  priority
                  style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                />
                <div className="header-title">
                  <h2>Editar Ficha</h2>
                </div>
              </div>
            </div>
          </div>
          {statusText && (
            <div className="mt-3 text-sm font-medium" style={{ color: 'var(--verde-primario)' }}>{statusText}</div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-zinc-600">Carregando…</div>
        ) : (
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <Section title="Informações Pessoais" className="info-pessoais">
              <Grid cols={2}>
                <Field label={personType==='PJ' ? 'Razão Social' : 'Nome do Cliente'} value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queue('app','primary_name', v); }} />
                {personType === 'PJ' ? (
                  <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={18} />
                ) : (
                  <Field label="CPF" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCpf(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={14} />
                )}
              </Grid>
            </Section>

            {/* Contato */}
            <Section title="Informações de Contato" className="info-contato">
              <Grid cols={2}>
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queue('app','phone', m); }} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queue('app','whatsapp', m); }} />
              </Grid>
              <Grid cols={1}>
                <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queue('app','email', v); }} />
              </Grid>
            </Section>

            {/* Endereço */}
            <Section title="Endereço" className="endereco">
              <Grid cols={2}>
                <div className="mt-1">
                  <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queue('app','address_line', v); }} />
                </div>
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queue('app','address_number', v); }} />
              </Grid>
              <Grid cols={3}>
                <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queue('app','address_complement', v); }} />
                <div className="mt-1">
                  <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queue('app','bairro', v); }} />
                </div>
                <div className="mt-1">
                  <Field label="CEP" value={app.cep||''} onChange={(v)=>{ setApp({...app, cep:v}); queue('app','cep', v); }} />
                </div>
              </Grid>
            </Section>

            {/* Preferências e serviços */}
            <Section title="Planos e Serviços" className="planos-servicos">
              <Grid cols={2}>
                <SelectAdv label="Plano de Internet" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queue('app','plano_acesso', v); }} options={PLANO_OPTIONS as any} />
                <Select label="Dia de vencimento" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queue('app','venc', v); }} options={VENC_OPTIONS as any} />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queue('app','sva_avulso', v); }} options={SVA_OPTIONS as any} />
                <Select label="Carnê impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queue('app','carne_impresso', val); }} options={["Sim","Não"]} />
              </Grid>
            </Section>

            {/* Agendamento */}
            <Section title="Agendamento" className="agendamento">
              <Grid cols={3}>
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <Field label="Instalação agendada para" value={dueAt} onChange={(v)=>{ setDueAt(v); queue('card','due_at', v ? new Date(v).toISOString() : null); }} placeholder="YYYY-MM-DD" />
                <Field label="Horário" value={horaAt} onChange={(v)=>{ setHoraAt(v); queue('card','hora_at', v ? `${v}:00` : null); }} placeholder="HH:MM" />
              </Grid>
            </Section>

            {/* Pareceres */}
            <Section title="Pareceres" className="pareceres">
              <PareceresList
                cardId={cardId}
                notes={pareceres as any}
                onReply={async (pid, text) => { await supabase.rpc('add_parecer', { p_card_id: cardId, p_text: text, p_parent_id: pid }); }}
                onEdit={async (id, text) => { await supabase.rpc('edit_parecer', { p_card_id: cardId, p_note_id: id, p_text: text }); }}
                onDelete={async (id) => { await supabase.rpc('delete_parecer', { p_card_id: cardId, p_note_id: id }); }}
              />
              <div className="mt-3 flex gap-2">
                <input
                  value={novoParecer}
                  onChange={(e)=> setNovoParecer(e.target.value)}
                  onKeyDown={(e)=>{
                    const v = (e.currentTarget.value || '') + (e.key.length===1? e.key : '');
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) { setCmdOpenParecer(true); setCmdQueryParecer(v.slice(slashIdx+1).toLowerCase()); } else { setCmdOpenParecer(false); }
                    if (v.endsWith('/tarefa')) { setTaskOpen({ open:true, parentId:null, taskId:null, source:'parecer' }); }
                    else if (v.endsWith('/anexo')) { setAttachOpen({ open:true, parentId:null, source:'parecer' }); }
                  }}
                  placeholder="Escrever novo parecer (use @Nome, /aprovado, /negado, /reanalise, /tarefa, /anexo)"
                  className="flex-1 field-input"
                />
                {cmdOpenParecer && (
                  <CmdDropdown
                    items={[
                      { key:'aprovado', label:'✅ Aprovado' },
                      { key:'negado', label:'⛔ Negado' },
                      { key:'reanalise', label:'🔁 Reanálise' },
                      { key:'tarefa', label:'📋 Tarefa' },
                      { key:'anexo', label:'📎 Anexo' },
                    ].filter(i=> i.key.includes(cmdQueryParecer))}
                    onPick={async (key)=>{
                      setCmdOpenParecer(false); setCmdQueryParecer('');
                      if (key==='tarefa') { setTaskOpen({ open:true, parentId:null, taskId:null, source:'parecer' }); return; }
                      if (key==='anexo') { setAttachOpen({ open:true, parentId:null, source:'parecer' }); return; }
                      try {
                        if (key==='aprovado') await changeStage(cardId, 'analise', 'aprovados');
                        else if (key==='negado') await changeStage(cardId, 'analise', 'negados');
                        else if (key==='reanalise') await changeStage(cardId, 'analise', 'reanalise');
                      } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                    }}
                  />
                )}
                <button onClick={addParecer} className="btn-primary-mznet">+ Adicionar</button>
              </div>
            </Section>
          </div>
        )}

        {/* Conversas co-relacionadas */}
        <div className="mt-4">
          <Conversation
            cardId={cardId}
            onOpenTask={(parentId?: string) => setTaskOpen({ open: true, parentId: parentId ?? null, taskId: null, source: 'conversa' })}
            onOpenAttach={(parentId?: string) => setAttachOpen({ open: true, parentId: parentId ?? null, source: 'conversa' })}
            onEditTask={(taskId: string) => setTaskOpen({ open: true, parentId: null, taskId })}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary-mznet">Fechar</button>
        </div>
        </div>
      </div>
      {/* Drawers/Modais auxiliares */}
      <TaskDrawer
        open={taskOpen.open}
        onClose={()=> setTaskOpen({open:false, parentId:null, taskId:null})}
        cardId={cardId}
        commentId={taskOpen.parentId ?? null}
        taskId={taskOpen.taskId ?? null}
        onCreated={async (t)=> {
          if (taskOpen.source === 'parecer') {
            try { await supabase.rpc('add_parecer', { p_card_id: cardId, p_text: `📋 Tarefa criada: ${t.description}`, p_parent_id: null }); } catch {}
          }
        }}
      />
      <AttachmentsModal
        open={attachOpen.open}
        onClose={()=> setAttachOpen({open:false})}
        cardId={cardId}
        commentId={attachOpen.parentId ?? null}
        onCompleted={async (files)=> {
          if (attachOpen.source === 'parecer' && files.length>0) {
            const names = files.map(f=> f.name).join(', ');
            try { await supabase.rpc('add_parecer', { p_card_id: cardId, p_text: `📎 Anexo(s): ${names}`, p_parent_id: null }); } catch {}
          }
        }}
      />
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="section-card rounded-xl p-4 sm:p-6">
      <div className="section-header mb-4 sm:mb-6">
        <h3 className={`section-title text-sm font-semibold ${className || ''}`}>{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1|2|3; children: React.ReactNode }) {
  const cls = cols===1? 'grid-cols-1' : cols===2? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid gap-4 sm:gap-6 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, disabled, placeholder, maxLength, inputMode }: { label: string; value: string; onChange: (v:string)=>void; disabled?: boolean; placeholder?: string; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"] }) {
  const id = `fld-${label.replace(/\s+/g,'-').toLowerCase()}`;
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e)=> onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`mt-1 h-12 rounded-lg px-5 py-3 ${disabled ? 'field-input-disabled' : ''}`}
      />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  const id = `sel-${label.replace(/\s+/g,'-').toLowerCase()}`;
  return (
    <div className="w-full space-y-2">
      <Label htmlFor={id} className="field-label text-h1">{label}</Label>
      <SimpleSelect
        value={value}
        onChange={(v)=> onChange(v)}
        options={options}
        placeholder=""
        className="mt-1"
      />
    </div>
  );
}

function SelectAdv({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />
}

function CmdDropdown({ items, onPick }: { items: { key: string; label: string }[]; onPick: (key: string) => void | Promise<void> }) {
  return (
    <div className="mt-2 max-h-48 w-full overflow-auto rounded border bg-white text-sm shadow">
      {items.length === 0 ? (
        <div className="px-3 py-2 text-zinc-500">Sem comandos</div>
      ) : (
        items.map((i) => (
          <button key={i.key} onClick={() => onPick(i.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50">
            <span>{i.label}</span>
          </button>
        ))
      )}
    </div>
  );
}

type Note = { id: string; text: string; author_name?: string; created_at?: string; parent_id?: string|null; level?: number; deleted?: boolean };
function buildTree(notes: Note[]): Note[] {
  const byId = new Map<string, any>();
  notes.forEach(n => byId.set(n.id, { ...n, children: [] as any[] }));
  const roots: any[] = [];
  notes.forEach(n => {
    const node = byId.get(n.id)!;
    if (n.parent_id && byId.has(n.parent_id)) byId.get(n.parent_id).children.push(node); else roots.push(node);
  });
  const sortFn = (a:any,b:any)=> new Date(a.created_at||'').getTime() - new Date(b.created_at||'').getTime();
  const sortTree = (arr:any[]) => { arr.sort(sortFn); arr.forEach(x=> sortTree(x.children)); };
  sortTree(roots);
  return roots as any;
}

function PareceresList({ cardId, notes, onReply, onEdit, onDelete }: { cardId: string; notes: Note[]; onReply: (parentId:string, text:string)=>Promise<any>; onEdit: (id:string, text:string)=>Promise<any>; onDelete: (id:string)=>Promise<any> }) {
  const tree = useMemo(()=> buildTree(notes||[]), [notes]);
  return (
    <div className="space-y-2">
      {(!notes || notes.length===0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map(n => <NoteItem key={n.id} node={n} depth={0} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
  );
}

function NoteItem({ node, depth, onReply, onEdit, onDelete }: { node: any; depth: number; onReply: (parentId:string, text:string)=>Promise<any>; onEdit: (id:string, text:string)=>Promise<any>; onDelete: (id:string)=>Promise<any> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [text, setText] = useState(node.text || '');
  const [reply, setReply] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : '';
  if (node.deleted) return null;
  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800" style={{ marginLeft: depth*16 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{node.author_name || '—'} <span className="ml-2 text-[11px] text-zinc-500">{ts}</span></div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button className="text-emerald-700" onClick={()=> setIsReplying(v=>!v)}>→ Responder</button>
          <button className="text-zinc-700" onClick={()=> setIsEditing(v=>!v)}>Editar</button>
          <button className="text-red-600" onClick={async ()=> { if (confirm('Excluir este parecer?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir parecer'); } } }}>Excluir</button>
        </div>
      </div>
      {!isEditing ? (
        <div className="mt-1 whitespace-pre-line">{node.text}</div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(e)=> setText(e.target.value)} className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-emerald-500" />
          <button className="btn-small-primary" onClick={async ()=> { try { await onEdit(node.id, text); setIsEditing(false); } catch(e:any){ alert(e?.message||'Falha ao editar parecer'); } }}>Salvar</button>
          <button className="btn-small-secondary" onClick={()=> { setText(node.text||''); setIsEditing(false); }}>Cancelar</button>
        </div>
      )}
      {isReplying && (
        <div className="mt-2 flex gap-2">
          <div className="flex-1">
            <input
              value={reply}
              onChange={(e)=> setReply(e.target.value)}
              onKeyDown={(e)=>{
                const v = (e.currentTarget.value || '') + (e.key.length===1 ? e.key : '');
                const slashIdx = v.lastIndexOf('/');
                if (slashIdx>=0) { setCmdOpen(true); setCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setCmdOpen(false); }
                if (e.key==='Enter' && !e.shiftKey) {
                  e.preventDefault(); (async ()=>{ try { await onReply(node.id, reply); setReply(''); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder parecer'); } })();
                  return;
                }
              }}
              placeholder="Responder... (/aprovado, /negado, /reanalise, /tarefa, /anexo)"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-emerald-500"
            />
            {cmdOpen && (
              <CmdDropdown
                items={[
                  { key:'aprovado', label:'✅ Aprovado' },
                  { key:'negado', label:'⛔ Negado' },
                  { key:'reanalise', label:'🔁 Reanálise' },
                  { key:'tarefa', label:'📋 Tarefa' },
                  { key:'anexo', label:'📎 Anexo' },
                ].filter(i=> i.key.includes(cmdQuery))}
                onPick={async (key)=>{
                  setCmdOpen(false); setCmdQuery('');
                  if (key==='tarefa') { const ev = new CustomEvent('mz-open-task'); window.dispatchEvent(ev); return; }
                  if (key==='anexo') { const ev = new CustomEvent('mz-open-attach'); window.dispatchEvent(ev); return; }
                  try {
                    if (key==='aprovado') await changeStage((window as any).mz_card_id || '', 'analise', 'aprovados');
                    else if (key==='negado') await changeStage((window as any).mz_card_id || '', 'analise', 'negados');
                    else if (key==='reanalise') await changeStage((window as any).mz_card_id || '', 'analise', 'reanalise');
                  } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                }}
              />
            )}
          </div>
          <button className="btn-small-primary" onClick={async ()=> { try { await onReply(node.id, reply); setReply(''); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder parecer'); } }}>Enviar</button>
        </div>
      )}
      {node.children && node.children.length>0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((c:any)=> <NoteItem key={c.id} node={c} depth={depth+1} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}
