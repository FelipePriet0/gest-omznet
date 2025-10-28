"use client";

import React, { useMemo, useState } from "react";
import { BasicInfoPF, BasicInfoPJ, PessoaTipo } from "@/features/cadastro/types";
import { criarFichaPF, criarFichaPJ, checkDuplicidadeQuery } from "@/features/cadastro/services";

export function BasicInfoModal({
  open,
  tipo,
  onBack,
  onClose,
}: {
  open: boolean;
  tipo: PessoaTipo | null;
  onBack: () => void;
  onClose: () => void;
}) {
  function digitsOnly(s: string) {
    return (s || "").replace(/\D+/g, "");
  }
  function formatCpf(input: string) {
    const d = digitsOnly(input).slice(0, 11);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 9);
    const p4 = d.slice(9, 11);
    let out = p1;
    if (p2) out += "." + p2;
    if (p3) out += "." + p3;
    if (p4) out += "-" + p4;
    return out;
  }
  function formatCnpj(input: string) {
    const d = digitsOnly(input).slice(0, 14);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 5);
    const p3 = d.slice(5, 8);
    const p4 = d.slice(8, 12);
    const p5 = d.slice(12, 14);
    let out = p1;
    if (p2) out += "." + p2;
    if (p3) out += "." + p3;
    if (p4) out += "/" + p4;
    if (p5) out += "-" + p5;
    return out;
  }
  function formatDateBR(input: string) {
    const d = digitsOnly(input).slice(0, 8); // DDMMYYYY
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 4);
    const p3 = d.slice(4, 8);
    let out = p1;
    if (p2) out += "/" + p2;
    if (p3) out += "/" + p3;
    return out;
  }
  function formatPhoneBR(input: string) {
    const d = digitsOnly(input).slice(0, 11);
    const len = d.length;
    const ddd = d.slice(0, 2);
    if (len <= 2) return d;
    if (len <= 6) return `(${ddd}) ${d.slice(2)}`; // up to 4 after DDD
    if (len <= 10) return `(${ddd}) ${d.slice(2, 6)}-${d.slice(6)}`; // landline style
    return `(${ddd}) ${d.slice(2, 7)}-${d.slice(7)}`; // mobile style 5+4
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [pf, setPF] = useState<BasicInfoPF>({ nome: "", cpf: "" });
  const [pj, setPJ] = useState<BasicInfoPJ>({ razaoSocial: "", cnpj: "" });

  const isPF = tipo === "PF";
  const title = isPF ? "Dados Básicos - Ficha PF" : "Dados Básicos - Ficha PJ";

  const canContinue = useMemo(() => {
    if (!open || !tipo) return false;
    if (tipo === "PF") {
      return Boolean(pf.nome && pf.cpf);
    }
    return Boolean(pj.razaoSocial && pj.cnpj);
  }, [open, tipo, pf, pj]);

  // Sempre que abrir o modal ou trocar o tipo, limpamos os campos
  React.useEffect(() => {
    if (open) {
      setPF({ nome: "", cpf: "", nasc: "", tel: "", whats: "", email: "", naturalidade: "", uf: "" });
      setPJ({ razaoSocial: "", fantasia: "", cnpj: "", email: "", tel: "", whats: "" });
      setError(null);
      setOk(null);
    }
  }, [open, tipo]);

  if (!open || !tipo) return null;

  async function onSubmit() {
    setError(null);
    setOk(null);
    if (!canContinue) return;
    setLoading(true);
    try {
      const doc = isPF ? pf.cpf : pj.cnpj;
      const exists = await checkDuplicidadeQuery(doc);
      if (exists) {
        setError("Documento já cadastrado. Verifique em Feitas/Cadastrar no MK.");
        setLoading(false);
        return;
      }

      const res = isPF ? await criarFichaPF(pf) : await criarFichaPJ(pj);
      setOk("Ficha criada com sucesso.");
      // Abre expanded em outra aba
      const url = isPF ? `/cadastro/pf/${res.applicantId}` : `/cadastro/pj/${res.applicantId}`;
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {}
      onClose();
    } catch (e: any) {
      setError(e?.message || "Erro ao criar ficha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[94vw] max-w-[720px] rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        {isPF ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome completo" placeholder="Nome completo do Lead" value={pf.nome} onChange={(v) => setPF({ ...pf, nome: v })} className="sm:col-span-2" />
            <Field
              label="CPF"
              placeholder="000.000.000-00"
              value={pf.cpf}
              onChange={(v) => setPF({ ...pf, cpf: formatCpf(v) })}
              inputMode="numeric"
            />
            <Field
              label="Data de nascimento"
              placeholder="dd/mm/aaaa"
              value={pf.nasc || ""}
              onChange={(v) => setPF({ ...pf, nasc: formatDateBR(v) })}
              inputMode="numeric"
              maxLength={10}
            />
            <Field
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={pf.tel || ""}
              onChange={(v) => setPF({ ...pf, tel: formatPhoneBR(v) })}
              inputMode="numeric"
              maxLength={15}
            />
            <Field
              label="Whatsapp"
              placeholder="(00) 00000-0000"
              value={pf.whats || ""}
              onChange={(v) => setPF({ ...pf, whats: formatPhoneBR(v) })}
              inputMode="numeric"
              maxLength={15}
            />
            <Field label="E-mail" placeholder="cliente@exemplo.com" value={pf.email || ""} onChange={(v) => setPF({ ...pf, email: v })} />
            <Field label="Cidade de nascimento" placeholder="Ex: São Paulo" value={pf.naturalidade || ""} onChange={(v) => setPF({ ...pf, naturalidade: v })} />
            <Field label="UF" placeholder="SP" value={pf.uf || ""} onChange={(v) => setPF({ ...pf, uf: v })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Razão Social" placeholder="Ex: Empresa LTDA" value={pj.razaoSocial} onChange={(v) => setPJ({ ...pj, razaoSocial: v })} />
            <Field label="Nome Fantasia" placeholder="Ex: Mznet" value={pj.fantasia || ""} onChange={(v) => setPJ({ ...pj, fantasia: v })} />
            <Field
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              value={pj.cnpj}
              onChange={(v) => setPJ({ ...pj, cnpj: formatCnpj(v) })}
              inputMode="numeric"
            />
            <Field label="E-mail" placeholder="empresa@exemplo.com" value={pj.email || ""} onChange={(v) => setPJ({ ...pj, email: v })} />
            <Field
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={pj.tel || ""}
              onChange={(v) => setPJ({ ...pj, tel: formatPhoneBR(v) })}
              inputMode="numeric"
              maxLength={15}
            />
            <Field
              label="Whatsapp"
              placeholder="(00) 00000-0000"
              value={pj.whats || ""}
              onChange={(v) => setPJ({ ...pj, whats: formatPhoneBR(v) })}
              inputMode="numeric"
              maxLength={15}
            />
          </div>
        )}

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {ok && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</div>}

        <div className="mt-6 flex items-center justify-between">
          <button onClick={onBack} className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700">Voltar</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancelar</button>
            <button
              onClick={onSubmit}
              disabled={!canContinue || loading}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Salvando…" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, className, inputMode, maxLength }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; className?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; maxLength?: number }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-emerald-500 text-emerald-700 placeholder:text-emerald-600 placeholder:opacity-60"
      />
    </div>
  );
}
