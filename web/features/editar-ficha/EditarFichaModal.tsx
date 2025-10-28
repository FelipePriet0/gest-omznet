"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [personType, setPersonType] = useState<'PF'|'PJ'|null>(null);

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

  function addParecer() {
    const txt = novoParecer.trim();
    if (!txt) return;
    const next = [...pareceres, txt];
    setPareceres(next);
    setNovoParecer('');
    queue('card', 'reanalysis_notes', next);
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[95vw] max-w-[980px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Editar Ficha</h2>
          <div className="text-xs text-zinc-600">{statusText}</div>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-600">Carregando…</div>
        ) : (
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <Section title="Informações Pessoais">
              <Grid cols={2}>
                <Field label={personType==='PJ' ? 'Razão Social' : 'Nome completo'} value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queue('app','primary_name', v); }} />
                {personType === 'PJ' ? (
                  <Field label="CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCnpj(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={18} />
                ) : (
                  <Field label="CPF" value={app.cpf_cnpj||''} onChange={(v)=>{ const m = formatCpf(v); setApp({...app, cpf_cnpj:m}); queue('app','cpf_cnpj', m); }} inputMode="numeric" maxLength={14} />
                )}
              </Grid>
            </Section>

            {/* Contato */}
            <Section title="Informações de Contato">
              <Grid cols={2}>
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, phone:m}); queue('app','phone', m); }} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ const m=maskPhoneLoose(v); setApp({...app, whatsapp:m}); queue('app','whatsapp', m); }} />
              </Grid>
              <Grid cols={1}>
                <Field label="E-mail" value={app.email||''} onChange={(v)=>{ setApp({...app, email:v}); queue('app','email', v); }} />
              </Grid>
            </Section>

            {/* Endereço */}
            <Section title="Endereço">
              <Grid cols={2}>
                <Field label="Logradouro" value={app.address_line||''} onChange={(v)=>{ setApp({...app, address_line:v}); queue('app','address_line', v); }} />
                <Field label="Número" value={app.address_number||''} onChange={(v)=>{ setApp({...app, address_number:v}); queue('app','address_number', v); }} />
                <Field label="Complemento" value={app.address_complement||''} onChange={(v)=>{ setApp({...app, address_complement:v}); queue('app','address_complement', v); }} />
                <Field label="CEP" value={app.cep||''} onChange={(v)=>{ setApp({...app, cep:v}); queue('app','cep', v); }} />
                <Field label="Bairro" value={app.bairro||''} onChange={(v)=>{ setApp({...app, bairro:v}); queue('app','bairro', v); }} />
              </Grid>
            </Section>

            {/* Preferências e serviços */}
            <Section title="Preferências e Serviços">
              <Grid cols={2}>
                <SelectAdv label="Plano" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queue('app','plano_acesso', v); }} options={PLANO_OPTIONS as any} />
                <Select label="Vencimento" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queue('app','venc', v); }} options={VENC_OPTIONS as any} />
                <Select label="Carnê Impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queue('app','carne_impresso', val); }} options={["Sim","Não"]} />
                <SelectAdv label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queue('app','sva_avulso', v); }} options={SVA_OPTIONS as any} />
              </Grid>
            </Section>

            {/* Agendamento */}
            <Section title="Agendamento">
              <Grid cols={3}>
                <Field label="Feito em" value={createdAt} onChange={()=>{}} disabled />
                <Field label="Instalação agendada para" value={dueAt} onChange={(v)=>{ setDueAt(v); queue('card','due_at', v ? new Date(v).toISOString() : null); }} placeholder="YYYY-MM-DD" />
                <Select label="Horário" value={horaAt} onChange={(v)=>{ setHoraAt(v); queue('card','hora_at', v ? `${v}:00` : null); }} options={horarios} />
              </Grid>
            </Section>

            {/* Pareceres */}
            <Section title="Pareceres">
              <div className="space-y-2">
                {pareceres.length === 0 && <div className="text-xs text-zinc-500">Nenhum parecer</div>}
                {pareceres.map((p, idx) => (
                  <div key={idx} className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">{p}</div>
                ))}
                <div className="flex gap-2">
                  <input value={novoParecer} onChange={(e)=> setNovoParecer(e.target.value)} placeholder="Escrever novo parecer" className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                  <button onClick={addParecer} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">+ Adicionar</button>
                </div>
              </div>
            </Section>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-2 text-sm font-semibold text-gray-800">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Grid({ cols, children }: { cols: 1|2|3; children: React.ReactNode }) {
  const cls = cols===1? 'grid-cols-1' : cols===2? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

function Field({ label, value, onChange, disabled, placeholder, maxLength, inputMode }: { label: string; value: string; onChange: (v:string)=>void; disabled?: boolean; placeholder?: string; maxLength?: number; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input value={value} onChange={(e)=> onChange(e.target.value)} disabled={disabled} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode}
        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled? 'bg-gray-100 text-gray-400':'text-emerald-700'} border-gray-300 focus:border-emerald-500`} />
    </div>
  );
}

type Opt = string | { label: string; value: string; disabled?: boolean };
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <select value={value} onChange={(e)=> onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500 text-emerald-700">
        <option value=""></option>
        {options.map((o, idx) => {
          if (typeof o === 'string') return <option key={o} value={o}>{o}</option>;
          return <option key={o.value+idx} value={o.value} disabled={!!o.disabled}>{o.label}</option>;
        })}
      </select>
    </div>
  );
}

function SelectAdv({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: Opt[] }) {
  return <Select label={label} value={value} onChange={onChange} options={options} />
}
