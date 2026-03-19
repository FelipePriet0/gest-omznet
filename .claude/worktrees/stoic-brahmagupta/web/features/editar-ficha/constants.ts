import type { Opt } from "./types";

export const PLANO_OPTIONS: Opt[] = [
  { label: "— Normais —", value: "__hdr_norm", disabled: true },
  { label: "100 Mega - R$ 59,90", value: "100 Mega - R$ 59,90" },
  { label: "250 Mega - R$ 69,90", value: "250 Mega - R$ 69,90" },
  { label: "500 Mega - R$ 79,90", value: "500 Mega - R$ 79,90" },
  { label: "1000 Mega (1Gb) - R$ 99,90", value: "1000 Mega (1Gb) - R$ 99,90" },
  { label: "— IP Dinâmico —", value: "__hdr_ipdin", disabled: true },
  { label: "100 Mega + IP Dinâmico - R$ 74,90", value: "100 Mega + IP Dinâmico - R$ 74,90" },
  { label: "250 Mega + IP Dinâmico - R$ 89,90", value: "250 Mega + IP Dinâmico - R$ 89,90" },
  { label: "500 Mega + IP Dinâmico - R$ 94,90", value: "500 Mega + IP Dinâmico - R$ 94,90" },
  { label: "1000 Mega (1Gb) + IP Dinâmico - R$ 114,90", value: "1000 Mega (1Gb) + IP Dinâmico - R$ 114,90" },
  { label: "— IP Fixo —", value: "__hdr_ipfixo", disabled: true },
  { label: "100 Mega + IP Fixo - R$ 259,90", value: "100 Mega + IP Fixo - R$ 259,90" },
  { label: "250 Mega + IP Fixo - R$ 269,90", value: "250 Mega + IP Fixo - R$ 269,90" },
  { label: "500 Mega + IP Fixo - R$ 279,90", value: "500 Mega + IP Fixo - R$ 279,90" },
  { label: "1000 Mega (1Gb) + IP Fixo - R$ 299,90", value: "1000 Mega (1Gb) + IP Fixo - R$ 299,90" },
];

export const SVA_OPTIONS: Opt[] = [
  { label: "XXXXX", value: "XXXXX" },
  { label: "— Streaming e TV —", value: "__hdr_stream", disabled: true },
  { label: "MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)", value: "MZ TV+ (MZPLAY PLUS - ITTV): R$ 29,90 (01 TELA)" },
  { label: "DEZZER: R$ 15,00", value: "DEZZER: R$ 15,00" },
  { label: "MZ CINE-PLAY: R$ 19,90", value: "MZ CINE-PLAY: R$ 19,90" },
  { label: "— Hardware e Equipamentos —", value: "__hdr_hw", disabled: true },
  { label: "SETUP BOX MZNET: R$ 100,00", value: "SETUP BOX MZNET: R$ 100,00" },
  { label: "— Wi‑Fi Extend — Sem fio —", value: "__hdr_wifi_sf", disabled: true },
  { label: "01 WI‑FI EXTEND (SEM FIO): R$ 25,90", value: "01 WI‑FI EXTEND (SEM FIO): R$ 25,90" },
  { label: "02 WI‑FI EXTEND (SEM FIO): R$ 49,90", value: "02 WI‑FI EXTEND (SEM FIO): R$ 49,90" },
  { label: "03 WI‑FI EXTEND (SEM FIO): R$ 74,90", value: "03 WI‑FI EXTEND (SEM FIO): R$ 74,90" },
  { label: "— Wi‑Fi Extend — Cabo —", value: "__hdr_wifi_cab", disabled: true },
  { label: "01 WI‑FI EXTEND (CABEADO): R$ 35,90", value: "01 WI‑FI EXTEND (CABEADO): R$ 35,90" },
  { label: "02 WI‑FI EXTEND (CABEADO): R$ 69,90", value: "02 WI‑FI EXTEND (CABEADO): R$ 69,90" },
  { label: "03 WI‑FI EXTEND (CABEADO): R$ 100,00", value: "03 WI‑FI EXTEND (CABEADO): R$ 100,00" },
];

export const VENC_OPTIONS = ["5", "10", "15", "20", "25"] as const;

