export type AppModel = {
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
  carne_impresso?: boolean;
  sva_avulso?: string;
};

export type Opt = string | { label: string; value: string; disabled?: boolean };

