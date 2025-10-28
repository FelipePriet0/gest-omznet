"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AppModel = {
  primary_name?: string; cpf_cnpj?: string; phone?: string; whatsapp?: string; email?: string;
  address_line?: string; address_number?: string; address_complement?: string; cep?: string; bairro?: string;
  plano_acesso?: string; venc?: string | number | null; carne_impresso?: boolean; sva_avulso?: string;
};

export function EditarFichaModal({ open, onClose, cardId, applicantId }: { open: boolean; onClose: () => void; cardId: string; applicantId: string; }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [app, setApp] = useState<AppModel>({});
  const [dueAt, setDueAt] = useState<string>("");
  const [horaAt, setHoraAt] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [pareceres, setPareceres] = useState<string[]>([]);
  const [novoParecer, setNovoParecer] = useState<string>("");

  const timer = useRef<NodeJS.Timeout | null>(null);
  const pendingApp = useRef<Partial<AppModel>>({});
  const pendingCard = useRef<any>({});

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data: a } = await supabase
          .from('applicants')
          .select('primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso')
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
        setCreatedAt(c?.created_at ? new Date(c.created_at).toLocaleString() : "");
        setDueAt(c?.due_at ? new Date(c.due_at).toISOString().slice(0,10) : "");
        setHoraAt(c?.hora_at ? String(c.hora_at).slice(0,5) : "");
        setPareceres(Array.isArray(c?.reanalysis_notes) ? c!.reanalysis_notes as any : []);
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
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
                <Field label="Nome / Razão Social" value={app.primary_name||''} onChange={(v)=>{ setApp({...app, primary_name:v}); queue('app','primary_name', v); }} />
                <Field label="CPF/CNPJ" value={app.cpf_cnpj||''} onChange={(v)=>{ setApp({...app, cpf_cnpj:v}); queue('app','cpf_cnpj', v); }} />
              </Grid>
            </Section>

            {/* Contato */}
            <Section title="Informações de Contato">
              <Grid cols={2}>
                <Field label="Telefone" value={app.phone||''} onChange={(v)=>{ setApp({...app, phone:v}); queue('app','phone', v); }} />
                <Field label="Whatsapp" value={app.whatsapp||''} onChange={(v)=>{ setApp({...app, whatsapp:v}); queue('app','whatsapp', v); }} />
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
                <Field label="Plano" value={app.plano_acesso||''} onChange={(v)=>{ setApp({...app, plano_acesso:v}); queue('app','plano_acesso', v); }} />
                <Field label="Vencimento (5/10/15/20/25)" value={String(app.venc||'')} onChange={(v)=>{ setApp({...app, venc:v}); queue('app','venc', v); }} />
                <Select label="Carnê Impresso" value={app.carne_impresso ? 'Sim':'Não'} onChange={(v)=>{ const val = (v==='Sim'); setApp({...app, carne_impresso:val}); queue('app','carne_impresso', val); }} options={["Sim","Não"]} />
                <Field label="SVA Avulso" value={app.sva_avulso||''} onChange={(v)=>{ setApp({...app, sva_avulso:v}); queue('app','sva_avulso', v); }} />
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

function Field({ label, value, onChange, disabled, placeholder }: { label: string; value: string; onChange: (v:string)=>void; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input value={value} onChange={(e)=> onChange(e.target.value)} disabled={disabled} placeholder={placeholder}
        className={`h-10 w-full rounded-lg border px-3 text-sm outline-none ${disabled? 'bg-gray-100 text-gray-400':'text-emerald-700'} border-gray-300 focus:border-emerald-500`} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <select value={value} onChange={(e)=> onChange(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500 text-emerald-700">
        <option value=""></option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

