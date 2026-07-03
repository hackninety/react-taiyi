/**
 * 局數史例共享层：解析上游 docs/example.md（经 /api/docs/example），
 * 供史例页与排盘页「史例對照」（年份命中即展示并入 AI 导出）共用。
 * 年份约定：史例 md 的负数 = 公元前 N 年直记；应用输入为天文纪年（0 = 前 1 年）。
 */
import { firstTable } from './mdlite';
import { fetchDoc } from '../taiyi/pan';

export interface ExampleRow {
  /** 公元前直记（-578 = 公元前 578 年） */
  year: number;
  /** 史載局數（原文，可能为「19、31」等并记形式） */
  kook: string;
  event: string;
  source: string;
}

export function parseExamples(md: string): ExampleRow[] {
  const t = firstTable(md);
  return (t?.rows ?? [])
    .map((r) => ({ year: Number(r[0]), kook: r[1] ?? '', event: r[2] ?? '', source: r[3] ?? '' }))
    .filter((r) => Number.isFinite(r.year));
}

let cache: ExampleRow[] | null = null;
let inflight: Promise<ExampleRow[]> | null = null;

/** 会话级缓存加载（依赖后端 docs 端点；失败时抛出，由调用方静默处理） */
export function loadExamples(base: string): Promise<ExampleRow[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetchDoc('example', base)
      .then((md) => { cache = parseExamples(md); return cache; })
      .catch((e: unknown) => { inflight = null; throw e; });
  }
  return inflight;
}

/** 天文纪年 → 公元前直记（无 0 年） */
export const toBCDirect = (astroYear: number): number => (astroYear <= 0 ? astroYear - 1 : astroYear);

export function matchExamples(rows: ExampleRow[], astroYear: number): ExampleRow[] {
  const y = toBCDirect(astroYear);
  return rows.filter((r) => r.year === y);
}
