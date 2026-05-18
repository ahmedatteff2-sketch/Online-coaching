import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const fmtDate = (d: string | Date | null | undefined, p = 'd MMM yyyy') =>
  d ? format(typeof d === 'string' ? parseISO(d) : d, p) : '—';

export const fmtRelative = (d: string | Date | null | undefined) =>
  d ? formatDistanceToNow(typeof d === 'string' ? parseISO(d) : d, { addSuffix: true }) : '—';

export const fmtMoney = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

export const fmtKg = (kg: number | null | undefined, dp = 1) =>
  kg == null ? '—' : `${kg.toFixed(dp)} kg`;

export const fmtCm = (cm: number | null | undefined, dp = 1) =>
  cm == null ? '—' : `${cm.toFixed(dp)} cm`;

export const fmtPercent = (n: number | null | undefined) =>
  n == null ? '—' : `${Math.round(n)}%`;
