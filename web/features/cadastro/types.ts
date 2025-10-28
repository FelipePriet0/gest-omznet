export type PessoaTipo = 'PF' | 'PJ';

export interface BasicInfoPF {
  nome: string;
  cpf: string;
  nasc?: string; // dd/mm/aaaa (opcional para esta etapa; banco aceita date)
  tel?: string;
  whats?: string;
  email?: string;
  naturalidade?: string;
  uf?: string;
}

export interface BasicInfoPJ {
  razaoSocial: string;
  fantasia?: string;
  cnpj: string;
  email?: string;
  tel?: string;
  whats?: string;
}

