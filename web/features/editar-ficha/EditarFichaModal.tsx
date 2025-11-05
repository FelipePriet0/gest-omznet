"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { User as UserIcon, ArrowRight, MoreHorizontal, CheckCircle, XCircle, RefreshCcw, ClipboardList, Paperclip, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Conversation } from "@/features/comments/Conversation";
import { TaskDrawer } from "@/features/tasks/TaskDrawer";
import { AttachmentsModal } from "@/features/attachments/AttachmentsModal";
import { changeStage } from "@/features/kanban/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarReady } from "@/components/ui/calendar-ready";
import { SimpleSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimeMultiSelect } from "@/components/ui/time-multi-select";
import { listProfiles, type ProfileLite } from "@/features/comments/services";

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
  { label: 'XXXXX', value: 'XXXXX' },
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
  const [horaArr, setHoraArr] = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [pareceres, setPareceres] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [mentionOpenParecer, setMentionOpenParecer] = useState(false);
  const [mentionFilterParecer, setMentionFilterParecer] = useState("");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const vendorName = useMemo(()=> profiles.find(p=> p.id===createdBy)?.full_name || "—", [profiles, createdBy]);
  const analystName = useMemo(()=> profiles.find(p=> p.id===assigneeId)?.full_name || "—", [profiles, assigneeId]);
  const [novoParecer, setNovoParecer] = useState<string>("");
  const [cmdOpenParecer, setCmdOpenParecer] = useState(false);
  const [cmdQueryParecer, setCmdQueryParecer] = useState("");
  const [cmdAnchorParecer, setCmdAnchorParecer] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  const parecerRef = useRef<HTMLTextAreaElement|null>(null);
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
          .select('created_at, due_at, hora_at, reanalysis_notes, created_by, assignee_id')
          .eq('id', cardId)
          .single();
        if (!active) return;
        const a2:any = { ...(a||{}) };
        if (a2 && typeof a2.venc !== 'undefined' && a2.venc !== null) a2.venc = String(a2.venc);
        setApp(a2||{});
        setPersonType((a as any)?.person_type ?? null);
        setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
        setDueAt(c?.due_at ? (()=>{ const d=new Date(c.due_at); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; })() : "");
        if (Array.isArray((c as any)?.hora_at)) {
          const arr:any[] = (c as any).hora_at;
          const list = arr.map(h => String(h).slice(0,5));
          setHoraArr(list);
          setHoraAt(list[0] || "");
        } else {
          const v = c?.hora_at ? String(c.hora_at).slice(0,5) : "";
          setHoraAt(v);
          setHoraArr(v ? [v] : []);
        }
        setPareceres(Array.isArray(c?.reanalysis_notes) ? c!.reanalysis_notes as any : []);
        setCreatedBy((c as any)?.created_by || "");
        setAssigneeId((c as any)?.assignee_id || "");

        try {
          setProfiles(await listProfiles());
        } catch {}

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
            if (row.due_at) { const d=new Date(row.due_at); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); setDueAt(`${y}-${m}-${day}`); }
            if (row.hora_at) {
              const arr = Array.isArray(row.hora_at) ? row.hora_at : [row.hora_at];
              const list = arr.map((h:any)=> String(h).slice(0,5));
              setHoraAt(list[0] || "");
              setHoraArr(list);
            }
            if (Array.isArray(row.reanalysis_notes)) setPareceres(row.reanalysis_notes);
            if (typeof row.created_by !== 'undefined') setCreatedBy(row.created_by || "");
            if (typeof row.assignee_id !== 'undefined') setAssigneeId(row.assignee_id || "");
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

  function openExpanded() {
    if (!applicantId) return;
    const isPJ = personType === 'PJ';
    const url = isPJ ? `/cadastro/pj/${applicantId}?card=${cardId}&from=analisar` : `/cadastro/pf/${applicantId}?card=${cardId}&from=analisar`;
    try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
  }

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
            <div className="header-content flex items-center justify-between">
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
              <div className="flex items-center gap-2">
                <button type="button" onClick={openExpanded} className="btn-primary-mznet">
                  Analisar
                </button>
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
              <div className="mt-4 sm:mt-6">
                <Grid cols={1}>
                  <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queue('app','email', v); }} />
                </Grid>
              </div>
            </Section>

            {/* Endereço */}
            <Section title="Endereço" className="endereco">
              <Grid cols={2}>
                <div className="mt-1">
                  <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queue('app','address_line', v); }} />
                </div>
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queue('app','address_number', v); }} />
              </Grid>
              <div className="mt-4 sm:mt-6">
                <Grid cols={3}>
                  <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queue('app','address_complement', v); }} />
                  <div className="mt-1">
                    <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queue('app','bairro', v); }} />
                  </div>
                  <div className="mt-1">
                    <Field label="CEP" value={app.cep||''} onChange={(v)=>{ setApp({...app, cep:v}); queue('app','cep', v); }} />
                  </div>
                </Grid>
              </div>
            </Section>

            {/* Preferências e serviços */}
            <Section title="Planos e Serviços" className="planos-servicos">
              <Grid cols={2}>
                <SelectAdv label="Plano de Internet" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queue('app','plano_acesso', v); }} options={PLANO_OPTIONS as any} />
                <Select label="Dia de vencimento" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queue('app','venc', v); }} options={VENC_OPTIONS as any}
                  triggerClassName="border-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  contentClassName="border-0 bg-white shadow-none"
                  triggerStyle={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                  contentStyle={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queue('app','sva_avulso', v); }} options={SVA_OPTIONS as any} />
                <Select label="Carnê impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queue('app','carne_impresso', val); }} options={["Sim","Não"]}
                  triggerClassName="border-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                  contentClassName="border-0 bg-white shadow-none"
                  triggerStyle={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                  contentStyle={{ boxShadow: 'none', outline: 'none', border: 'none' }}
                />
              </Grid>
            </Section>

            {/* Agendamento */}
            <Section title="Agendamento" className="agendamento">
              <Grid cols={3}>
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <CalendarReady
                  label="Instalação agendada para"
                  value={dueAt}
                  onChange={(val)=> { setDueAt(val); queue('card','due_at', new Date(val).toISOString()); }}
                />
                <TimeMultiSelect
                  label="Horário"
                  times={horarios}
                  value={horaArr}
                  onApply={(vals)=> {
                    setHoraArr(vals);
                    setHoraAt(vals[0] || "");
                    if (vals.length === 0) queue('card','hora_at', null);
                    else queue('card','hora_at', vals.map(v=> `${v}:00`));
                  }}
                  allowedPairs={[['08:30','10:30'],['13:30','15:30']]}
                />
              </Grid>
            </Section>

            {/* Equipe Responsável */}
            <Section title="Equipe Responsável" className="info-contato">
              <Grid cols={2}>
                <Field label="Vendedor" value={vendorName} onChange={()=>{}} disabled />
                <Field label="Analistas" value={analystName} onChange={()=>{}} disabled />
              </Grid>
            </Section>

            {/* Pareceres */}
            <div className="section-card rounded-xl p-4 sm:p-6">
              {/* Header Area - Red Box */}
              <div className="section-header mb-4 sm:mb-6 flex items-center justify-between">
                <h3 className="section-title text-sm font-semibold pareceres">Pareceres</h3>
              </div>
              
              {/* Content Area - Yellow Box */}
              <div className="section-content">
                <div className="mb-3 relative">
                <Textarea
                  ref={parecerRef}
                  value={novoParecer}
                  onChange={(e)=> {
                    const v = e.target.value || '';
                    setNovoParecer(v);
                    const atIdx = v.lastIndexOf('@');
                    if (atIdx >= 0) { setMentionFilterParecer(v.slice(atIdx + 1).trim()); setMentionOpenParecer(true); } else { setMentionOpenParecer(false); }
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) {
                      setCmdOpenParecer(true); setCmdQueryParecer(v.slice(slashIdx+1).toLowerCase());
                      if (parecerRef.current) {
                        const ta = parecerRef.current;
                        const c = getCaretCoordinates(ta, slashIdx + 1);
                        const rect = ta.getBoundingClientRect();
                        const top = rect.top + window.scrollY + c.top + c.height + 6;
                        const left = rect.left + window.scrollX + c.left;
                        setCmdAnchorParecer({ top, left });
                      }
                    }
                    else { setCmdOpenParecer(false); }
                  }}
                  onKeyDown={(e)=>{
                    // Enviar via Enter (sem Shift), anexando abaixo
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addParecer();
                      return;
                    }
                    // Atalhos /tarefa e /anexo + menções
                    const v = (e.currentTarget.value || '') + (e.key.length===1? e.key : '');
                    const atIdx = v.lastIndexOf('@');
                    if (atIdx>=0) { setMentionFilterParecer(v.slice(atIdx+1).trim()); setMentionOpenParecer(true); } else { setMentionOpenParecer(false); }
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) {
                      setCmdOpenParecer(true); setCmdQueryParecer(v.slice(slashIdx+1).toLowerCase());
                      if (parecerRef.current) {
                        const ta = parecerRef.current;
                        const c = getCaretCoordinates(ta, slashIdx + 1);
                        const rect = ta.getBoundingClientRect();
                        const top = rect.top + window.scrollY + c.top + c.height + 6;
                        const left = rect.left + window.scrollX + c.left;
                        setCmdAnchorParecer({ top, left });
                      }
                    } else { setCmdOpenParecer(false); }
                    if (v.endsWith('/tarefa')) { setTaskOpen({ open:true, parentId:null, taskId:null, source:'parecer' }); }
                    else if (v.endsWith('/anexo')) { setAttachOpen({ open:true, parentId:null, source:'parecer' }); }
                  }}
                  onKeyUp={(e)=>{
                    const v = e.currentTarget.value || '';
                    const slashIdx = v.lastIndexOf('/');
                    if (slashIdx>=0) {
                      setCmdOpenParecer(true); setCmdQueryParecer(v.slice(slashIdx+1).toLowerCase());
                      if (parecerRef.current) {
                        const ta = parecerRef.current;
                        const c = getCaretCoordinates(ta, slashIdx + 1);
                        const top = ta.offsetTop + c.top + c.height + 6;
                        const leftRaw = ta.offsetLeft + c.left;
                        const left = Math.max(0, Math.min(leftRaw, ta.clientWidth - 256));
                        setCmdAnchorParecer({ top, left });
                      }
                    } else { setCmdOpenParecer(false); }
                  }}
                  placeholder="Escreva um novo parecer… Use @ para mencionar"
                  rows={4}
                />
                  {mentionOpenParecer && (
                    <div className="absolute z-50 left-0 bottom-full mb-2">
                    <MentionDropdownParecer
                      items={profiles.filter((p)=> p.full_name.toLowerCase().includes(mentionFilterParecer.toLowerCase()))}
                      onPick={(p)=> {
                        const idx = (novoParecer || '').lastIndexOf('@');
                        const newVal = (novoParecer || '').slice(0, idx + 1) + p.full_name + ' ';
                        setNovoParecer(newVal);
                        setMentionOpenParecer(false);
                      }}
                    />
                    </div>
                  )}
                  {cmdOpenParecer && (
                    <div className="absolute z-50 left-0 bottom-full mb-2">
                      <CmdDropdown
                        items={[
                          { key:'aprovado', label:'Aprovado' },
                          { key:'negado', label:'Negado' },
                          { key:'reanalise', label:'Reanálise' },
                          { key:'tarefa', label:'Tarefa' },
                          { key:'anexo', label:'Anexo' },
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
                        initialQuery={cmdQueryParecer}
                      />
                    </div>
                  )}
                </div>
                <PareceresList
                  cardId={cardId}
                  notes={pareceres as any}
                  profiles={profiles}
                  onReply={async (pid, text) => { await supabase.rpc('add_parecer', { p_card_id: cardId, p_text: text, p_parent_id: pid }); }}
                  onEdit={async (id, text) => { await supabase.rpc('edit_parecer', { p_card_id: cardId, p_note_id: id, p_text: text }); }}
                  onDelete={async (id) => { await supabase.rpc('delete_parecer', { p_card_id: cardId, p_note_id: id }); }}
                />
              </div>
            </div>
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
function Select({ label, value, onChange, options, groups, enableCtrlMergeHover, triggerClassName, contentClassName, triggerStyle, contentStyle }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[]; groups?: string[][]; enableCtrlMergeHover?: boolean; triggerClassName?: string; contentClassName?: string; triggerStyle?: React.CSSProperties; contentStyle?: React.CSSProperties }) {
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
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
        triggerStyle={triggerStyle}
        contentStyle={contentStyle}
        groups={groups}
        enableCtrlMergeHover={enableCtrlMergeHover}
      />
    </div>
  );
}

function SelectAdv({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />
}

function CmdDropdown({ items, onPick, initialQuery }: { items: { key: string; label: string }[]; onPick: (key: string) => void | Promise<void>; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  useEffect(()=> setQ(initialQuery || ""), [initialQuery]);
  const iconFor = (key: string) => {
    if (key === 'aprovado') return <CheckCircle className="w-4 h-4" />;
    if (key === 'negado') return <XCircle className="w-4 h-4" />;
    if (key === 'reanalise') return <RefreshCcw className="w-4 h-4" />;
    if (key === 'tarefa') return <ClipboardList className="w-4 h-4" />;
    if (key === 'anexo') return <Paperclip className="w-4 h-4" />;
    return null;
  };
  const filtered = items.filter(i => i.key.includes(q) || i.label.toLowerCase().includes(q.toLowerCase()));
  const decisions = filtered.filter(i => ['aprovado','negado','reanalise'].includes(i.key));
  const actions = filtered.filter(i => ['tarefa','anexo'].includes(i.key));
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {decisions.length > 0 && (
        <div className="py-1">
          <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">Decisão da análise</div>
          {decisions.map((i) => (
            <button key={i.key} onClick={() => onPick(i.key)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left">
              {iconFor(i.key)}
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <div className="py-1 border-t border-zinc-100">
          <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">Ações</div>
          {actions.map((i) => (
            <button key={i.key} onClick={() => onPick(i.key)} className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left">
              {iconFor(i.key)}
              <span>{i.label}</span>
            </button>
          ))}
        </div>
      )}
      {decisions.length === 0 && actions.length === 0 && (
        <div className="px-3 py-2 text-zinc-500">Sem comandos</div>
      )}
    </div>
  );
}

type Note = { id: string; text: string; author_name?: string; author_role?: string|null; created_at?: string; parent_id?: string|null; level?: number; deleted?: boolean };
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

function PareceresList({ cardId, notes, profiles, onReply, onEdit, onDelete }: { cardId: string; notes: Note[]; profiles: ProfileLite[]; onReply: (parentId:string, text:string)=>Promise<any>; onEdit: (id:string, text:string)=>Promise<any>; onDelete: (id:string)=>Promise<any> }) {
  const tree = useMemo(()=> buildTree(notes||[]), [notes]);
  return (
    <div className="space-y-2">
      {(!notes || notes.length===0) && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
      {tree.map(n => <NoteItem key={n.id} node={n} depth={0} profiles={profiles} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)}
    </div>
  );
}

function NoteItem({ node, depth, profiles, onReply, onEdit, onDelete }: { node: any; depth: number; profiles: ProfileLite[]; onReply: (parentId:string, text:string)=>Promise<any>; onEdit: (id:string, text:string)=>Promise<any>; onDelete: (id:string)=>Promise<any> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const editRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement | null>(null);
  const replyTaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cmdAnchor, setCmdAnchor] = useState<{top:number;left:number}>({ top: 0, left: 0 });
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (isEditing && editRef.current && t && !editRef.current.contains(t)) {
        setIsEditing(false);
      }
      if (isReplying && replyRef.current && t && !replyRef.current.contains(t)) {
        setIsReplying(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isEditing, isReplying]);
  const [text, setText] = useState(node.text || '');
  const [reply, setReply] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  // Compositor Unificado - edição
  const [editMentionOpen, setEditMentionOpen] = useState(false);
  const [editMentionFilter, setEditMentionFilter] = useState('');
  const [editCmdOpen, setEditCmdOpen] = useState(false);
  const [editCmdQuery, setEditCmdQuery] = useState('');
  const ts = node.created_at ? new Date(node.created_at).toLocaleString() : '';
  if (node.deleted) return null;
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-6 text-sm text-zinc-800 shadow-[0_5.447px_5.447px_rgba(0,0,0,0.25)] pl-3"
      style={{ marginLeft: depth*16, borderLeftColor: 'var(--verde-primario)', borderLeftWidth: '8px' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-[var(--verde-primario)] shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium">{node.author_name || '—'} <span className="ml-2 text-[11px] text-zinc-500">{ts}</span></div>
            {node.author_role && <div className="text-[11px] text-zinc-500 truncate">{node.author_role}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Responder" onClick={()=> setIsReplying(v=>!v)} className="text-emerald-700 hover:opacity-90">
            <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </button>
          <ParecerMenu onEdit={()=> setIsEditing(true)} onDelete={async ()=> { if (confirm('Excluir este parecer?')) { try { await onDelete(node.id); } catch(e:any){ alert(e?.message||'Falha ao excluir parecer'); } } }} />
        </div>
      </div>
      {!isEditing ? (
        <div className="mt-1 whitespace-pre-line break-words">{node.text}</div>
      ) : (
        <div className="mt-2" ref={editRef}>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Compositor Unificado de Parecer</label>
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e)=> {
                const v = e.target.value || '';
                setText(v);
                const atIdx = v.lastIndexOf('@');
                if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                const slashIdx = v.lastIndexOf('/');
                if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
              }}
              onKeyDown={async (e:any)=>{
                // @ts-ignore
                if (e.nativeEvent && e.nativeEvent.isComposing) return;
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  try { await onEdit(node.id, (text||'').trim()); setIsEditing(false); } catch(e:any){ alert(e?.message||'Falha ao editar parecer'); }
                  return;
                }
                if (e.key==='Escape') { e.preventDefault(); setIsEditing(false); return; }
                const v = (e.currentTarget.value || '') + (e.key.length===1? e.key : '');
                const atIdx = v.lastIndexOf('@');
                if (atIdx>=0) { setEditMentionFilter(v.slice(atIdx+1).trim()); setEditMentionOpen(true); } else { setEditMentionOpen(false); }
                const slashIdx = v.lastIndexOf('/');
                if (slashIdx>=0) { setEditCmdOpen(true); setEditCmdQuery(v.slice(slashIdx+1).toLowerCase()); } else { setEditCmdOpen(false); }
              }}
              placeholder="Edite o parecer… Use @ para mencionar e / para comandos"
              rows={4}
            />
            {editMentionOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <MentionDropdownParecer
                  items={profiles.filter((p)=> (p.full_name||'').toLowerCase().includes(editMentionFilter.toLowerCase()))}
                  onPick={(p)=>{
                    const idx = (text||'').lastIndexOf('@');
                    const newVal = (text||'').slice(0, idx + 1) + p.full_name + ' ';
                    setText(newVal);
                    setEditMentionOpen(false);
                  }}
                />
              </div>
            )}
            {editCmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key:'aprovado', label:'Aprovado' },
                    { key:'negado', label:'Negado' },
                    { key:'reanalise', label:'Reanálise' },
                    { key:'tarefa', label:'Tarefa' },
                    { key:'anexo', label:'Anexo' },
                  ].filter(i=> i.key.includes(editCmdQuery) || i.label.toLowerCase().includes(editCmdQuery))}
                  onPick={async (key)=>{
                    setEditCmdOpen(false); setEditCmdQuery('');
                    if (key==='tarefa') { const ev = new CustomEvent('mz-open-task'); window.dispatchEvent(ev); return; }
                    if (key==='anexo') { const ev = new CustomEvent('mz-open-attach'); window.dispatchEvent(ev); return; }
                    try {
                      const cid = (window as any).mz_card_id || '';
                      if (key==='aprovado') await changeStage(cid, 'analise', 'aprovados');
                      else if (key==='negado') await changeStage(cid, 'analise', 'negados');
                      else if (key==='reanalise') await changeStage(cid, 'analise', 'reanalise');
                    } catch(e:any){ alert(e?.message||'Falha ao mover'); }
                  }}
                  initialQuery={editCmdQuery}
                />
              </div>
            )}
          </div>
          {/* Removidos CTAs; envio via Enter, cancelar via Esc */}
        </div>
      )}
      {isReplying && (
        <div className="mt-2 flex gap-2 relative" ref={replyRef}>
          <div className="flex-1">
            <Textarea
              ref={replyTaRef}
              value={reply}
              onChange={(e)=> {
                const v = e.target.value || '';
                setReply(v);
                const atIdx = v.lastIndexOf('@');
                if (atIdx>=0) { setMentionFilter(v.slice(atIdx+1).trim()); setMentionOpen(true); } else { setMentionOpen(false); }
                const slashIdx = v.lastIndexOf('/');
                if (slashIdx>=0) { setCmdOpen(true); setCmdQuery(v.slice(slashIdx+1).toLowerCase()); if (replyTaRef.current) { const c = getCaretCoordinates(replyTaRef.current, slashIdx+1); setCmdAnchor({ top: c.top + c.height + 6, left: Math.max(0, Math.min(c.left, replyTaRef.current.clientWidth - 256)) }); } }
                else { setCmdOpen(false); }
              }}
              onKeyDown={(e)=>{
                // Evita enviar durante composição (IME)
                // @ts-ignore
                if (e.nativeEvent && e.nativeEvent.isComposing) return;
                const v = (e.currentTarget.value || '') + (e.key.length===1 ? e.key : '');
                const slashIdx = v.lastIndexOf('/');
                if (slashIdx>=0) { setCmdOpen(true); setCmdQuery(v.slice(slashIdx+1).toLowerCase()); if (replyTaRef.current) { const c = getCaretCoordinates(replyTaRef.current, slashIdx+1); setCmdAnchor({ top: c.top + c.height + 6, left: Math.max(0, Math.min(c.left, replyTaRef.current.clientWidth - 256)) }); } } else { setCmdOpen(false); }
                if (e.key==='Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const t = reply.trim();
                  if (!t) return;
                  (async ()=>{ try { await onReply(node.id, t); setReply(''); setIsReplying(false); } catch(e:any){ alert(e?.message||'Falha ao responder parecer'); } })();
                  return;
                }
              }}
              placeholder="Responder... (/aprovado, /negado, /reanalise, /tarefa, /anexo)"
              rows={3}
            />
          {mentionOpen && (
            <div className="absolute z-50 left-0 bottom-full mb-2">
            <MentionDropdownParecer
              items={(profiles || []).filter((p)=> (p.full_name||'').toLowerCase().includes(mentionFilter.toLowerCase()))}
              onPick={(p)=> {
                const idx = (reply || '').lastIndexOf('@');
                const newVal = (reply || '').slice(0, idx + 1) + p.full_name + ' ';
                setReply(newVal);
                setMentionOpen(false);
              }}
            />
            </div>
          )}
            {cmdOpen && (
              <div className="absolute z-50 left-0 bottom-full mb-2">
                <CmdDropdown
                  items={[
                    { key:'aprovado', label:'Aprovado' },
                    { key:'negado', label:'Negado' },
                    { key:'reanalise', label:'Reanálise' },
                    { key:'tarefa', label:'Tarefa' },
                    { key:'anexo', label:'Anexo' },
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
                  initialQuery={cmdQuery}
                />
              </div>
            )}
          </div>
        </div>
      )}
          {node.children && node.children.length>0 && (
            <div className="mt-2 space-y-2">
              {node.children.map((c:any)=> <NoteItem key={c.id} node={c} depth={depth+1} profiles={profiles} onReply={onReply} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
          )}
    </div>
  );
}

function ParecerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node | null;
      if (open && menuRef.current && t && !menuRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);
  return (
    <div className="relative" ref={menuRef}>
      <button 
        aria-label="Mais ações" 
        className="parecer-menu-trigger p-2 rounded-full hover:bg-zinc-100 transition-colors duration-200" 
        onClick={()=> setOpen(v=>!v)}
      >
        <MoreHorizontal className="w-4 h-4 text-zinc-600" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div className="parecer-menu-dropdown absolute right-0 top-10 z-[9999] w-48 bg-white rounded-lg shadow-lg border border-zinc-200 py-1 overflow-hidden">
            <button 
              className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors duration-150" 
              onClick={()=> { setOpen(false); onEdit(); }}
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <div className="h-px bg-zinc-100 mx-2" />
            <button 
              className="parecer-menu-item flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-150" 
              onClick={async ()=> { setOpen(false); await onDelete(); }}
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Utilitário local para obter a posição do caret no textarea
function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  const props = [
    'direction','boxSizing','height','overflowX','overflowY','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','paddingTop','paddingRight','paddingBottom','paddingLeft','fontStyle','fontVariant','fontWeight','fontStretch','fontSize','fontFamily','lineHeight','textAlign','textTransform','textIndent','textDecoration','letterSpacing','tabSize','MozTabSize'
  ];
  props.forEach((p:any)=> { (mirror.style as any)[p] = (style as any)[p] ?? style.getPropertyValue(p); });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const spRect = span.getBoundingClientRect();
  const top = spRect.top + textarea.scrollTop;
  const left = spRect.left + textarea.scrollLeft;
  const height = spRect.height || parseFloat(style.lineHeight) || 16;
  document.body.removeChild(mirror);
  return { top, left, height };
}

function MentionDropdownParecer({ items, onPick }: { items: ProfileLite[]; onPick: (p: ProfileLite) => void }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((p) => p.full_name.toLowerCase().includes(q.toLowerCase()));
  const order: Array<{key: string; label: string}> = [
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'analista', label: 'Analista' },
    { key: 'gestor',   label: 'Gestor' },
  ];
  const byRole = (role: string) => filtered.filter((p) => (p.role || '').toLowerCase() === role);
  const hasAny = order.some(({key}) => byRole(key).length > 0);
  return (
    <div className="cmd-menu-dropdown mt-2 max-h-60 w-64 overflow-auto rounded-lg border border-zinc-200 bg-white text-sm shadow">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar pessoas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
      </div>
      {!hasAny ? (
        <div className="px-3 py-2 text-zinc-500">Sem resultados</div>
      ) : (
        order.map(({key,label}) => {
          const list = byRole(key);
          if (list.length === 0) return null;
          return (
            <div key={key} className="py-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">{label}</div>
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="cmd-menu-item flex w-full items-center gap-2 px-2 py-1.5 text-left"
                >
                  <span>{p.full_name}{p.role ? ` (${p.role})` : ''}</span>
                </button>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
