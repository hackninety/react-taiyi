/**
 * MCP 工具层（纯逻辑，协议接线见 server.ts）。
 *
 * 本地引擎：排盘 chart / 命法 mingfa / 皇极 huangji / 《太乙秘書》mishu /
 * 周易经文 yijing / 十精 tenjing / 判读规则 knowledge —— 复用 src/taiyi 与 src/lib，零后端依赖。
 * 后端透传：kintaiyi pan / life / liu / docs / 局數史例 —— 调 python-taiyi API
 * （env TAIYI_API 覆盖，默认生产 taiyi-api.0x7c.cc）；pan/life 支持键目录+键过滤，防上下文爆量。
 *
 * 年份约定：所有工具输入为**天文纪年**（0=公元前1年）；调后端时转公元前直记（同 App remoteInput）。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  calculateTaiyi, calculateMingfa, calculateHuangji, applyTrueSolarTime,
  TAIYI_MIN_YEAR, TAIYI_MAX_YEAR, HUANGJI_MIN_YEAR, HUANGJI_MAX_YEAR,
  toJSONText, findStars, starsLoaded,
} from '../src/taiyi';
import type { AcumYear, ExportPayload, JiStyle, Sex, SolarTimeInfo, TaiyiInput } from '../src/taiyi';
import { setStarsData } from '../src/taiyi/tenjing';
import type { StarsTable } from '../src/taiyi/tenjing';
import { DEFAULT_API_BASE } from '../src/taiyi/remote';
import { fetchPan, fetchLife, fetchLiu, fetchDoc, PAN_GROUPS } from '../src/taiyi/pan';
import type { DocName } from '../src/taiyi/pan';
import { getMishu } from '../src/taiyi/mishu';
import type { Dun } from '../src/taiyi/types';
import { getHexagram } from '../src/taiyi/yijing';
import { KNOWLEDGE_APPENDIX } from '../src/lib/knowledge';
import { parseExamples, matchExamples } from '../src/lib/examples';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 后端地址：env TAIYI_API 覆盖，默认生产站（与前端 DEFAULT_API_BASE 同源） */
export function apiBase(): string {
  return (process.env.TAIYI_API ?? '').trim().replace(/\/+$/, '') || DEFAULT_API_BASE;
}

/** 天文纪年 → 后端「公元前直记」约定（600–9999 内恒等） */
const toRemoteInput = (i: TaiyiInput): TaiyiInput =>
  ({ ...i, year: i.year <= 0 ? i.year - 1 : i.year });

async function withSignal<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error(`后端请求超时（${ms / 1000}s）：${apiBase()}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const jsonText = (v: unknown): string => JSON.stringify(v, null, 2);
const sizeOf = (v: unknown): string => {
  const n = Buffer.byteLength(JSON.stringify(v), 'utf8');
  return n >= 1024 ? `${(n / 1024).toFixed(1)}KB` : `${n}B`;
};

// ── 本地：排盘 ────────────────────────────────────────────────

export interface ChartArgs {
  year: number; month: number; day: number; hour: number; minute: number;
  jiStyle: number; acumYear: number;
  /** 给出即附太乙命法（600–9999 内有效） */
  sex?: '男' | '女';
  /** 是否附皇极经世历（默认 true） */
  includeHuangji?: boolean;
  /** 给出即做真太阳时校正：出生/事发地东经度数 */
  trueSolarLongitude?: number;
  /** 输入时间的解释时区偏移分钟（默认 480 = UTC+8，中国钟表时间） */
  tzOffsetMinutes?: number;
}

export function chart(a: ChartArgs): string {
  const input: TaiyiInput = {
    year: a.year, month: a.month, day: a.day, hour: a.hour, minute: a.minute,
    jiStyle: a.jiStyle as JiStyle, acumYear: a.acumYear as AcumYear,
  };
  let effective = input;
  let solarTime: SolarTimeInfo | null = null;
  if (a.trueSolarLongitude !== undefined) {
    const tz = a.tzOffsetMinutes ?? 480;
    const adj = applyTrueSolarTime(input.year, input.month, input.day, input.hour, input.minute, a.trueSolarLongitude, tz);
    effective = { ...input, year: adj.year, month: adj.month, day: adj.day, hour: adj.hour, minute: adj.minute };
    solarTime = {
      applied: true,
      place: `东经 ${a.trueSolarLongitude}°`,
      longitude: a.trueSolarLongitude,
      tzOffsetMinutes: tz,
      offsetMinutes: adj.offsetMinutes,
      adjusted: { year: adj.year, month: adj.month, day: adj.day, hour: adj.hour, minute: adj.minute },
    };
  }
  const inRange = effective.year >= TAIYI_MIN_YEAR && effective.year <= TAIYI_MAX_YEAR;
  const result = calculateTaiyi(effective, inRange ? 'standard' : 'huangji');
  const mingfa = a.sex && inRange ? calculateMingfa(effective, a.sex as Sex) : null;
  const huangji = (a.includeHuangji ?? true)
    ? calculateHuangji(effective.year, { month: effective.month, day: effective.day, hour: effective.hour })
    : null;
  const payload: ExportPayload = { result, mingfa, huangji, solarTime };
  return toJSONText(payload);
}

// ── 本地：命法 ────────────────────────────────────────────────

export function mingfa(a: { year: number; month: number; day: number; hour: number; minute: number; sex: '男' | '女' }): string {
  if (a.year < TAIYI_MIN_YEAR || a.year > TAIYI_MAX_YEAR) {
    throw new Error(`命法依标准历法，年份须在 ${TAIYI_MIN_YEAR}–${TAIYI_MAX_YEAR}`);
  }
  const input: TaiyiInput = { year: a.year, month: a.month, day: a.day, hour: a.hour, minute: a.minute, jiStyle: 3, acumYear: 0 };
  return jsonText(calculateMingfa(input, a.sex as Sex));
}

// ── 本地：皇极经世历 ─────────────────────────────────────────

export function huangji(a: { year: number; month?: number; day?: number; hour?: number }): string {
  if (a.year < HUANGJI_MIN_YEAR || a.year > HUANGJI_MAX_YEAR) {
    throw new Error(`皇极一元全跨度为 ${HUANGJI_MIN_YEAR}–${HUANGJI_MAX_YEAR}（天文纪年）`);
  }
  const month = a.month ?? 6;
  const day = a.day ?? 15;
  const hour = a.hour ?? 12;
  const info = calculateHuangji(a.year, { month, day, hour });
  const payload: ExportPayload = {
    result: null,
    huangji: info,
    huangjiOnlyInput: { year: a.year, month, day, hour, minute: 0 },
  };
  return toJSONText(payload);
}

// ── 本地：《太乙秘書》局断辞 ─────────────────────────────────

export function mishu(a: { dun: string; num: number }): string {
  const dun = (a.dun.replace('阳', '陽').replace('阴', '陰').replace(/遁$/, '')) as Dun;
  const entry = getMishu(dun, a.num);
  if (!entry) throw new Error(`查无此局：${a.dun} 第 ${a.num} 局（dun 取 陽/陰，num 取 1–72）`);
  return jsonText({ 出處: `《太乙秘書》${dun}遁第 ${a.num} 局`, 五元干支: entry.ganzhi, 斷辭: entry.text });
}

// ── 本地：周易经文 ───────────────────────────────────────────

export function yijing(a: { names: string[] }): string {
  const out = a.names.map((name) => {
    const h = getHexagram(name);
    if (!h) return { 查询: name, 未找到: '卦名无法识别（可用繁/简体卦名或卦符 ䷀–䷿）' };
    return { 查询: name, 卦: h.name, 符: h.symbol, 卦辞: h.guaCi, 爻辞: h.yao.map((y) => `${y.name}：${y.text}`) };
  });
  return jsonText(out);
}

// ── 本地：十精七曜 ───────────────────────────────────────────

export async function tenjing(a: { year: number; month: number; day: number }): Promise<string> {
  if (!starsLoaded()) {
    const file = path.join(ROOT, 'public', 'data', 'stars_data.json');
    setStarsData(JSON.parse(await readFile(file, 'utf8')) as StarsTable);
  }
  const stars = findStars(a.year, a.month, a.day);
  if (!stars) throw new Error('该日期无十精数据（预计算表范围外）');
  return jsonText({ 说明: '地支 → 所落七曜（日/月/辰星/太白/熒惑/歲星/填星）', 落位: stars });
}

// ── 本地：判读规则速查 ───────────────────────────────────────

export function knowledge(): string {
  return KNOWLEDGE_APPENDIX;
}

// ── 远程：kintaiyi 全解释盘（键目录 + 键过滤） ────────────────

function pickKeys(data: Record<string, unknown>, keys: string[]): { picked: Record<string, unknown>; missing: string[] } {
  const picked: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const k of keys) {
    if (k in data) picked[k] = data[k];
    else missing.push(k);
  }
  return { picked, missing };
}

export async function panRemote(a: { year: number; month: number; day: number; hour: number; minute: number; jiStyle: number; acumYear: number; keys?: string[] }): Promise<string> {
  const input: TaiyiInput = {
    year: a.year, month: a.month, day: a.day, hour: a.hour, minute: a.minute,
    jiStyle: a.jiStyle as JiStyle, acumYear: a.acumYear as AcumYear,
  };
  const resp = await withSignal(30000, (s) => fetchPan(toRemoteInput(input), apiBase(), true, s));
  if (!a.keys?.length) {
    const grouped = new Set(PAN_GROUPS.flatMap((g) => g.keys));
    return jsonText({
      上游: resp.ref,
      提示: '全解释盘约 90KB，已按主题列出键目录（含体积）；请再次调用并以 keys 选取所需键（可跨分组多选）。',
      分组: PAN_GROUPS
        .map((g) => ({
          分组: g.title,
          说明: g.note,
          键: g.keys.filter((k) => k in resp.pan).map((k) => `${k} (${sizeOf(resp.pan[k])})`),
        }))
        .filter((g) => g.键.length > 0),
      其他键: Object.keys(resp.pan).filter((k) => !grouped.has(k)).map((k) => `${k} (${sizeOf(resp.pan[k])})`),
    });
  }
  const { picked, missing } = pickKeys(resp.pan, a.keys);
  return jsonText({ 上游: resp.ref, ...(missing.length ? { 未找到键: missing } : {}), 内容: picked });
}

// ── 远程：命法卷二十釋文（键目录 + 键过滤） ──────────────────

export async function lifeRemote(a: { year: number; month: number; day: number; hour: number; minute: number; sex: '男' | '女'; keys?: string[] }): Promise<string> {
  const input: TaiyiInput = { year: a.year, month: a.month, day: a.day, hour: a.hour, minute: a.minute, jiStyle: 3, acumYear: 0 };
  const resp = await withSignal(30000, (s) => fetchLife(toRemoteInput(input), a.sex as Sex, apiBase(), s));
  if (!a.keys?.length) {
    return jsonText({
      上游: resp.ref,
      提示: '命法全盘约 27KB，已列键目录（含体积）；请再次调用并以 keys 选取所需键。重点釋文：十提金賦 / 十二宮星斷 / 雙星同宮論 / 諸星上中下三等 / 卷二十。',
      键: Object.keys(resp.life).map((k) => `${k} (${sizeOf(resp.life[k])})`),
    });
  }
  const { picked, missing } = pickKeys(resp.life, a.keys);
  return jsonText({ 上游: resp.ref, ...(missing.length ? { 未找到键: missing } : {}), 内容: picked });
}

// ── 远程：流卦運多期 ─────────────────────────────────────────

export async function liuRemote(a: { year: number; month: number; day: number; hour: number; minute: number }): Promise<string> {
  if (a.year < 1) throw new Error('流卦運不支持公元前（上游 hex_timeline 依 Python datetime，下限公元 1 年）');
  const input: TaiyiInput = { year: a.year, month: a.month, day: a.day, hour: a.hour, minute: a.minute, jiStyle: 3, acumYear: 0 };
  const resp = await withSignal(30000, (s) => fetchLiu(input, apiBase(), s));
  return jsonText({
    上游: resp.ref,
    须知: '此为命法流卦（自出身卦挨步，随起局四柱含时辰呈相位变化，非全年恒定）；规范且全年不变的年運卦是排盘 result.yearGua（值年卦），论流年以值年卦为纲、流卦相位为辅。',
    流卦運: resp.liu,
  });
}

// ── 远程：局數史例 ───────────────────────────────────────────

export async function historyExamples(a: { year?: number }): Promise<string> {
  const md = await withSignal(15000, (s) => fetchDoc('example', apiBase(), s));
  const rows = parseExamples(md);
  if (a.year === undefined) {
    return jsonText({
      条数: rows.length,
      说明: '给 year（天文纪年，0=公元前1年）查该年史载纪事；下为可查年份（公元前直记）。',
      年份: rows.map((r) => r.year),
    });
  }
  const hit = matchExamples(rows, a.year);
  if (!hit.length) return jsonText({ 年份: a.year, 命中: 0, 说明: '该年无史例记载' });
  return jsonText({ 年份: a.year, 命中: hit.length, 史例: hit });
}

// ── 远程：上游文档 ───────────────────────────────────────────

const DOC_MAX = 12000;

export async function docs(a: { name: string; query?: string }): Promise<string> {
  const text = await withSignal(15000, (s) => fetchDoc(a.name as DocName, apiBase(), s));
  if (a.query) {
    const q = a.query.toLowerCase();
    const lines = text.split('\n');
    const hits: string[] = [];
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) hits.push(`${i + 1}: ${line.trim()}`);
    });
    if (!hits.length) return `文档 ${a.name} 中未找到「${a.query}」`;
    const capped = hits.slice(0, 200);
    return `${capped.join('\n')}${hits.length > 200 ? `\n……（共 ${hits.length} 行命中，仅显示前 200）` : ''}`;
  }
  if (text.length > DOC_MAX) {
    return `${text.slice(0, 4000)}\n\n……（全文 ${text.length} 字，已截断；请用 query 参数按关键词过滤取所需行）`;
  }
  return text;
}

// ── 状态 ─────────────────────────────────────────────────────

export async function status(): Promise<string> {
  const base = apiBase();
  let backend: unknown;
  try {
    backend = await withSignal(8000, async (s) => {
      const res = await fetch(`${base}/api/version`, { signal: s });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  } catch (e) {
    backend = { 不可用: e instanceof Error ? e.message : String(e) };
  }
  return jsonText({
    本地引擎: {
      太乙标准历法: `公元 ${TAIYI_MIN_YEAR}–${TAIYI_MAX_YEAR}（黄金用例对照 kintaiyi）；范围外自动皇极拟推口径`,
      皇极一元全跨度: `${HUANGJI_MIN_YEAR}–${HUANGJI_MAX_YEAR}（天文纪年；黄畿派岁卦已校订原文）`,
      本地数据: '《太乙秘書》144 局断辞 · 周易 64 卦经文 · 十精预计算表 · 判读规则速查',
    },
    后端: { 地址: base, 版本: backend },
    年份约定: '所有工具输入天文纪年（0=公元前1年）；史例年份列表为公元前直记。',
  });
}
