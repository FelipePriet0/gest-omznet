"use client";

import { parse, format, isValid } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export const BUSINESS_WINDOW_START = "08:00";
export const BUSINESS_WINDOW_END = "18:00";

const DATE_PATTERN = "yyyy-MM-dd";
const TIME_PATTERN = "HH:mm";

function safeParse(value: string | undefined, pattern: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, pattern, new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function parseDateOnly(dateISO?: string): Date | undefined {
  return safeParse(dateISO, DATE_PATTERN);
}

export function toDateOnlyISO(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, DATE_PATTERN);
}

export function formatDateLabel(dateISO?: string, fmt = "dd/MM/yyyy") {
  if (!dateISO) return "";
  const parsed = parseDateOnly(dateISO);
  if (!parsed) return "";
  return format(parsed, fmt);
}

export function localDateTimeToUtcISO(dateISO: string, timeHHmm: string, timeZone = DEFAULT_TIMEZONE) {
  const localDate = safeParse(`${dateISO} ${timeHHmm}`, `${DATE_PATTERN} ${TIME_PATTERN}`);
  if (!localDate) return undefined;
  return fromZonedTime(localDate, timeZone).toISOString();
}

export function startOfDayUtcISO(dateISO: string, timeZone = DEFAULT_TIMEZONE) {
  return localDateTimeToUtcISO(dateISO, "00:00", timeZone);
}

export function endOfDayUtcISO(dateISO: string, timeZone = DEFAULT_TIMEZONE) {
  return localDateTimeToUtcISO(dateISO, "23:59", timeZone);
}

export function utcISOToLocalParts(utcISO?: string, timeZone = DEFAULT_TIMEZONE) {
  if (!utcISO) return { dateISO: undefined, time: undefined };
  const utcDate = new Date(utcISO);
  if (Number.isNaN(utcDate.getTime())) return { dateISO: undefined, time: undefined };
  const zoned = toZonedTime(utcDate, timeZone);
  return {
    dateISO: formatInTimeZone(zoned, timeZone, DATE_PATTERN),
    time: formatInTimeZone(zoned, timeZone, TIME_PATTERN),
  };
}

export function clampToBusinessWindow(time: string) {
  if (time < BUSINESS_WINDOW_START) return BUSINESS_WINDOW_START;
  if (time > BUSINESS_WINDOW_END) return BUSINESS_WINDOW_END;
  return time;
}

export function isWithinBusinessWindow(time: string) {
  return time >= BUSINESS_WINDOW_START && time <= BUSINESS_WINDOW_END;
}

