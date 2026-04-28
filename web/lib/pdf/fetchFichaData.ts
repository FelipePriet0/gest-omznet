import { createClient } from "@supabase/supabase-js";

export type NoteItem = {
  id: string;
  text: string;
  author_id?: string | null;
  author_name?: string | null;
  decision?: string | null;
  created_at?: string | null;
  parent_id?: string | null;
};

export type AppData = {
  primary_name?: string;
  cpf_cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address_line?: string;
  address_number?: string;
  address_complement?: string;
  cep?: string;
  bairro?: string;
  plano_acesso?: string;
  venc?: string | number | null;
  sva_avulso?: string;
  carne_impresso?: boolean;
  quem_solicitou?: string;
  telefone_solicitante?: string;
  protocolo_mk?: string;
  meio?: string;
  representante_mz?: string;
  created_at?: string;
  info_spc?: string;
  info_pesquisador?: string;
  info_relevantes?: string;
  info_mk?: string;
  parecer_analise?: string;
};

export type PfData = {
  birth_date?: string | null;
  idade?: string;
  naturalidade?: string;
  uf_naturalidade?: string;
  do_ps?: string;
  cond?: string;
  endereco_do_ps?: string;
  tempo_endereco?: string;
  tipo_moradia?: string;
  tipo_moradia_obs?: string;
  unica_no_lote?: string;
  unica_no_lote_obs?: string;
  com_quem_reside?: string;
  nas_outras?: string;
  tem_contrato?: string;
  enviou_contrato?: string;
  nome_de?: string;
  enviou_comprovante?: string;
  tipo_comprovante?: string;
  nome_comprovante?: string;
  nome_locador?: string;
  telefone_locador?: string;
  locador_obs?: string;
  tem_internet_fixa?: string;
  empresa_internet?: string;
  plano_internet?: string;
  valor_internet?: string;
  observacoes?: string;
  profissao?: string;
  empresa?: string;
  vinculo?: string;
  vinculo_obs?: string;
  emprego_do_ps?: string;
  estado_civil?: string;
  conjuge_obs?: string;
  conjuge_nome?: string;
  conjuge_telefone?: string;
  conjuge_whatsapp?: string;
  conjuge_cpf?: string;
  conjuge_naturalidade?: string;
  conjuge_uf?: string;
  conjuge_idade?: string | null;
  conjuge_do_ps?: string;
  pai_nome?: string;
  pai_reside?: string;
  pai_telefone?: string;
  mae_nome?: string;
  mae_reside?: string;
  mae_telefone?: string;
  ref1_nome?: string;
  ref1_parentesco?: string;
  ref1_reside?: string;
  ref1_telefone?: string;
  ref2_nome?: string;
  ref2_parentesco?: string;
  ref2_reside?: string;
  ref2_telefone?: string;
};

export type PjData = {
  data_abertura?: string;
  nome_fantasia?: string;
  nome_fachada?: string;
  area_atuacao?: string;
  tipo_imovel?: string;
  obs_tipo_imovel?: string;
  tempo_endereco?: string;
  tipo_estabelecimento?: string;
  obs_estabelecimento?: string;
  end_ps?: string;
  fones_ps?: string;
  enviou_comprovante?: string | boolean | null;
  tipo_comprovante?: string;
  nome_comprovante?: string;
  contrato_social?: string | boolean | null;
  obs_contrato_social?: string;
  possui_internet?: string | boolean | null;
  operadora_internet?: string;
  plano_internet?: string;
  valor_internet?: string;
  socio1_nome?: string;
  socio1_cpf?: string;
  socio1_telefone?: string;
  socio2_nome?: string;
  socio2_cpf?: string;
  socio2_telefone?: string;
  socio3_nome?: string;
  socio3_cpf?: string;
  socio3_telefone?: string;
};

export type FichaPfResult = {
  app: AppData;
  pf: PfData;
  notes: NoteItem[];
};

export type FichaPjResult = {
  app: AppData;
  pj: PjData;
  notes: NoteItem[];
};

// Canonical → UI helpers (mirrors page.tsx)
function boolToUI(b: any): string {
  return b === true ? "Sim" : b === false ? "Não" : "";
}
function tipoMoradiaToUI(v: string | null): string {
  const m: any = { propria: "Própria", alugada: "Alugada", cedida: "Cedida", outros: "Outros" };
  return v ? (m[v] ?? v) : "";
}
function nasOutrasToUI(v: string | null): string {
  const m: any = { xxxxx: "XXXXX", parentes: "Parentes", locador: "Locador(a)", so_conhecidos: "Só conhecidos", nao_conhece: "Não conhece" };
  return v ? (m[v] ?? v) : "";
}
function tipoComprovToUI(v: string | null): string {
  const m: any = { energia: "Energia", agua: "Agua", internet: "Internet", outro: "Outro" };
  return v ? (m[v] ?? v) : "";
}
function vinculoToUI(v: string | null): string {
  const m: any = { carteira_assinada: "Carteira Assinada", presta_servicos: "Presta Serviços", contrato_trabalho: "Contrato de Trabalho", autonomo: "Autonômo", concursado: "Concursado", outro: "Outro" };
  return v ? (m[v] ?? v) : "";
}
function estadoCivilToUI(v: string | null): string {
  const m: any = { solteiro: "Solteiro(a)", casado: "Casado(a)", amasiado: "Amasiado(a)", separado: "Separado(a)", viuvo: "Viuvo(a)" };
  return v ? (m[v] ?? v) : "";
}
function meioToUI(v: string | null): string {
  const m: any = { ligacao: "Ligação", whatsapp: "Whatspp", presencial: "Presensicial", whats_uber: "Whats - Uber" };
  return v ? (m[v] ?? v) : "";
}
function tipoImovelToUI(v: string | null): string {
  const m: any = { comercio_terreo: "Comércio Terreo", comercio_sala: "Comércio Sala", casa: "Casa" };
  return v ? (m[v] ?? v) : "";
}
function tipoEstabToUI(v: string | null): string {
  const m: any = { propria: "Própria", alugada: "Alugada", cedida: "Cedida", outros: "Outros" };
  return v ? (m[v] ?? v) : "";
}
function isoToBR(iso?: any): string {
  if (!iso) return "";
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, mo, d] = s.slice(0, 10).split("-");
    return `${d}/${mo}/${y}`;
  }
  return s;
}

function makeClient(token: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  return client;
}

export async function fetchFichaPF(id: string, token: string): Promise<FichaPfResult> {
  const sb = makeClient(token);

  const [{ data: a }, { data: p }, { data: card }] = await Promise.all([
    sb
      .from("applicants")
      .select("primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk, parecer_analise, representante_mz, created_at")
      .eq("id", id)
      .single(),
    sb.from("pf_fichas").select("*").eq("applicant_id", id).maybeSingle(),
    sb
      .from("kanban_cards")
      .select("reanalysis_notes")
      .eq("applicant_id", id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const app: AppData = { ...(a as any) };
  if (app.meio) app.meio = meioToUI(app.meio as any);
  if (app.venc != null) app.venc = String(app.venc);

  const pfix: any = { ...(p as any) };
  if (pfix.birth_date) pfix.birth_date = isoToBR(pfix.birth_date);
  if (pfix.idade != null) pfix.idade = String(pfix.idade);
  if (pfix.conjuge_idade != null) pfix.conjuge_idade = String(pfix.conjuge_idade);
  for (const k of ["tem_contrato", "enviou_contrato", "enviou_comprovante", "tem_internet_fixa", "unica_no_lote"]) {
    if (k in pfix && pfix[k] !== null && typeof pfix[k] !== "string") pfix[k] = boolToUI(pfix[k]);
  }
  if (pfix.tipo_moradia != null) pfix.tipo_moradia = tipoMoradiaToUI(pfix.tipo_moradia);
  if (pfix.nas_outras != null) pfix.nas_outras = nasOutrasToUI(pfix.nas_outras);
  if (pfix.tipo_comprovante != null) pfix.tipo_comprovante = tipoComprovToUI(pfix.tipo_comprovante);
  if (pfix.vinculo != null) pfix.vinculo = vinculoToUI(pfix.vinculo);
  if (pfix.estado_civil != null) pfix.estado_civil = estadoCivilToUI(pfix.estado_civil);

  const notes: NoteItem[] = Array.isArray((card as any)?.reanalysis_notes)
    ? (card as any).reanalysis_notes
    : [];

  return { app, pf: pfix as PfData, notes };
}

export async function fetchFichaPJ(id: string, token: string): Promise<FichaPjResult> {
  const sb = makeClient(token);

  const [{ data: a }, { data: p }, { data: card }] = await Promise.all([
    sb
      .from("applicants")
      .select("primary_name, cpf_cnpj, phone, whatsapp, email, address_line, address_number, address_complement, cep, bairro, plano_acesso, venc, sva_avulso, carne_impresso, quem_solicitou, telefone_solicitante, protocolo_mk, meio, info_spc, info_pesquisador, info_relevantes, info_mk, representante_mz, created_at")
      .eq("id", id)
      .single(),
    sb.from("pj_fichas").select("*").eq("applicant_id", id).maybeSingle(),
    sb
      .from("kanban_cards")
      .select("reanalysis_notes")
      .eq("applicant_id", id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const app: AppData = { ...(a as any) };
  if (app.meio) app.meio = meioToUI(app.meio as any);
  if (app.venc != null) app.venc = String(app.venc);

  const pjfix: any = { ...(p as any) };
  if (pjfix.data_abertura) pjfix.data_abertura = isoToBR(pjfix.data_abertura);
  for (const k of ["enviou_comprovante", "contrato_social", "possui_internet"]) {
    if (k in pjfix && pjfix[k] !== null && typeof pjfix[k] !== "string") pjfix[k] = boolToUI(pjfix[k]);
  }
  if (pjfix.tipo_imovel != null) pjfix.tipo_imovel = tipoImovelToUI(pjfix.tipo_imovel);
  if (pjfix.tipo_estabelecimento != null) pjfix.tipo_estabelecimento = tipoEstabToUI(pjfix.tipo_estabelecimento);
  if (pjfix.tipo_comprovante != null) pjfix.tipo_comprovante = tipoComprovToUI(pjfix.tipo_comprovante);

  const notes: NoteItem[] = Array.isArray((card as any)?.reanalysis_notes)
    ? (card as any).reanalysis_notes
    : [];

  return { app, pj: pjfix as PjData, notes };
}
