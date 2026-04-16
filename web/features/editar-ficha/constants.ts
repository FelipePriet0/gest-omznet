import type { Opt } from "./types";

export const PLANO_OPTIONS: Opt[] = [
  { label: "— Normais —", value: "__hdr_norm", disabled: true },
  { label: "150 Mega - R$ 59,90", value: "150 Mega - R$ 59,90" },
  { label: "300 Mega - R$ 69,90", value: "300 Mega - R$ 69,90" },
  { label: "600 Mega - R$ 79,90", value: "600 Mega - R$ 79,90" },
  { label: "1000 Mega (1Gb) - R$ 99,90", value: "1000 Mega (1Gb) - R$ 99,90" },
  { label: "— IP Dinâmico —", value: "__hdr_ipdin", disabled: true },
  { label: "150 Mega + IP Dinâmico - R$ 74,90", value: "150 Mega + IP Dinâmico - R$ 74,90" },
  { label: "300 Mega + IP Dinâmico - R$ 89,90", value: "300 Mega + IP Dinâmico - R$ 89,90" },
  { label: "600 Mega + IP Dinâmico - R$ 94,90", value: "600 Mega + IP Dinâmico - R$ 94,90" },
  { label: "1000 Mega (1Gb) + IP Dinâmico - R$ 114,90", value: "1000 Mega (1Gb) + IP Dinâmico - R$ 114,90" },
  { label: "— IP Fixo —", value: "__hdr_ipfixo", disabled: true },
  { label: "150 Mega + IP Fixo - R$ 259,90", value: "150 Mega + IP Fixo - R$ 259,90" },
  { label: "300 Mega + IP Fixo - R$ 269,90", value: "300 Mega + IP Fixo - R$ 269,90" },
  { label: "600 Mega + IP Fixo - R$ 279,90", value: "600 Mega + IP Fixo - R$ 279,90" },
  { label: "1000 Mega (1Gb) + IP Fixo - R$ 299,90", value: "1000 Mega (1Gb) + IP Fixo - R$ 299,90" },
];

export const SVA_OPTIONS: Opt[] = [
  { label: "XXXXX", value: "XXXXX" },
  { label: "— Streaming e TV —", value: "__hdr_stream", disabled: true },
  { label: "MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)", value: "MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)" },
  { label: "DEZZER: R$ 15,00", value: "DEZZER: R$ 15,00" },
  { label: "MZ CINE-PLAY: R$ 19,90", value: "MZ CINE-PLAY: R$ 19,90" },
  { label: "— Hardware e Equipamentos —", value: "__hdr_hw", disabled: true },
  { label: "SETUP BOX MZNET: R$100,00 A VISTA OU R$120,00 EM ATÉ 3X NO CARTÃO", value: "SETUP BOX MZNET: R$100,00 A VISTA OU R$120,00 EM ATÉ 3X NO CARTÃO" },
  { label: "ROKU TV: R$200,00 A VISTA OU R$230,00 EM ATÉ 3X NO CARTÃO", value: "ROKU TV: R$200,00 A VISTA OU R$230,00 EM ATÉ 3X NO CARTÃO" },
  { label: "— Wi‑Fi Extend —", value: "__hdr_wifi", disabled: true },
  { label: "WIFI EXTEND - R$35", value: "WIFI EXTEND - R$35" },
];

export const VENC_OPTIONS = ["5", "10", "15", "20", "25"] as const;
