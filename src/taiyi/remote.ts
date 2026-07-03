/**
 * kintaiyi 权威后端数据源（python-taiyi，github.com/hackninety/python-taiyi）。
 *
 * 策略：**后端优先** —— 后端直接运行上游 kentang2017/kintaiyi 源码（pin SHA、可升级），
 * 返回与黄金用例同构的字段集；本地 TS 引擎同时出盘并**逐字段对照**（漂移检测）：
 * - 一致：正常展示，标注「与本地引擎逐字段一致」；
 * - 不一致：醒目提示差异字段（上游可能已更新算法，须复核并同步本地引擎）；
 * - 后端不可用/超时/已知崩溃组合：自动回退本地引擎并明显提示。
 */
import type { TaiyiInput, TaiyiResult } from './types';

/** 生产默认 API（Cloudflare 反代 HTTPS）；可用 VITE_TAIYI_API 或运行时设置覆盖 */
export const DEFAULT_API_BASE = 'https://taiyi-api.0x7c.cc';

const LS_BASE = 'taiyi.apiBase';
const LS_SOURCE = 'taiyi.dataSource';

export type DataSource = 'remote' | 'local';

function trimBase(v: string): string {
  return v.trim().replace(/\/+$/, '');
}

export function getApiBase(): string {
  try {
    const v = localStorage.getItem(LS_BASE);
    if (v) return trimBase(v);
  } catch { /* SSR/隐私模式 */ }
  const env = (import.meta.env?.VITE_TAIYI_API as string | undefined) ?? '';
  return trimBase(env || DEFAULT_API_BASE);
}

export function saveApiBase(v: string): string {
  const t = trimBase(v) || DEFAULT_API_BASE;
  try { localStorage.setItem(LS_BASE, t); } catch { /* ignore */ }
  return t;
}

export function getDataSource(): DataSource {
  try {
    if (localStorage.getItem(LS_SOURCE) === 'local') return 'local';
  } catch { /* ignore */ }
  return 'remote'; // 默认后端优先
}

export function saveDataSource(v: DataSource): void {
  try { localStorage.setItem(LS_SOURCE, v); } catch { /* ignore */ }
}

/** 后端返回：chart 字段集与 tests/fixtures/golden.json 的 case 同构 */
export interface RemoteChartResp {
  source: string;
  /** 后端 pin 的上游 kintaiyi commit */
  ref: string;
  chart: Record<string, unknown>;
}

export async function fetchRemoteChart(
  input: TaiyiInput,
  base: string,
  signal?: AbortSignal,
): Promise<RemoteChartResp> {
  const res = await fetch(`${base}/api/taiyi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      year: input.year, month: input.month, day: input.day,
      hour: input.hour, minute: input.minute,
      ji: input.jiStyle, acum: input.acumYear,
    }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      const detail = body?.detail;
      if (detail?.code) msg = `${detail.code}: ${detail.message ?? ''}`;
      else if (typeof detail === 'string') msg = detail;
    } catch { /* keep msg */ }
    throw new Error(msg);
  }
  return res.json() as Promise<RemoteChartResp>;
}

/** kintaiyi 原生圆盘 SVG 地址（drawsvg，由后端渲染，随上游更新） */
export function panSvgUrl(input: TaiyiInput, base: string, withTenjing: boolean): string {
  const q = new URLSearchParams({
    year: String(input.year), month: String(input.month), day: String(input.day),
    hour: String(input.hour), minute: String(input.minute),
    ji: String(input.jiStyle), acum: String(input.acumYear),
    tenching: withTenjing ? '0' : '1',
  });
  return `${base}/api/taiyi/pan.svg?${q}`;
}

// ---------------------------------------------------------------------------
// 逐字段对照（漂移检测）：映射关系与 tests/engine.test.ts 黄金用例一致
// ---------------------------------------------------------------------------

export interface FieldDiff {
  field: string;
  local: string;
  remote: string;
  /** 已知口径差异说明（有意偏离，非漂移） */
  known?: string;
}

const fmt = (v: unknown): string =>
  v === undefined || v === null ? '—' : typeof v === 'string' ? v : JSON.stringify(v);

const eq = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const JQ_KNOWN =
  '节气判定为已知口径差异：本地按正确天文语义，上游 kintaiyi 在节气日交接时刻前会回扫跳过上一节气';

/**
 * 后端 chart（kintaiyi 原始字段）↔ 本地 TaiyiResult 逐字段对照。
 * 返回差异列表；空数组 = 完全一致。带 known 的项为文档化的有意偏离（信息级）。
 */
export function compareRemote(local: TaiyiResult, chart: Record<string, unknown>): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const push = (field: string, l: unknown, r: unknown, known?: string) => {
    if (!eq(l, r)) diffs.push({ field, local: fmt(l), remote: fmt(r), known });
  };

  push('干支五柱', local.ganzhi, chart.gz);
  push('农历', [local.lunar.year, local.lunar.month, local.lunar.day], chart.lunar);
  push('节气', local.jieqi, chart.jq, JQ_KNOWN);
  push('积数', local.kook.accNum, chart.acc);
  push('局式', local.kook.text, chart.kook_text);
  push('局数', local.kook.num, chart.kook_num);
  push('理天地人', local.kook.sanYear, chart.kook_year);
  push('太乙落宫', local.taiyiGong, chart.ty);
  push('文昌', local.skyEyes, chart.wc);
  push('文昌处境', local.skyEyesDesc ?? '', chart.wc_des ?? '');
  push('始击', local.shiJi, chart.sf);
  push('定目', local.dingMu, chart.se);
  push('计神', local.jiGod, chart.jigod);
  push('合神', local.heGod, chart.hegod);
  push('太岁', local.taisui, chart.taishui);
  push('主算', local.homeSuan.value, chart.home_cal);
  push('主将', local.homeGeneral, chart.home_g);
  push('主参', local.homeVGen, chart.home_v);
  push('客算', local.awaySuan.value, chart.away_cal);
  push('客将', local.awayGeneral, chart.away_g);
  push('客参', local.awayVGen, chart.away_v);
  push('定算', local.setSuan.value, chart.set_cal);
  push('定将', local.setGeneral, chart.set_g);
  push('定参', local.setVGen, chart.set_v);
  push('君基', local.kingBase, chart.kingbase);
  push('臣基', local.officerBase, chart.officerbase);
  push('民基', local.pplBase, chart.pplbase);
  push('四神', local.fourGod, chart.fgd);
  push('天乙', local.skyYi, chart.skyyi);
  push('地乙', local.earthYi, chart.earthyi);
  push('直符', local.zhiFu, chart.zhifu);
  push('飞符', local.flyFu, chart.flyfu);
  push('太岁禽星', local.yearChin, chart.year_chin);
  push('始击值宿', local.shiJiXiu, chart.sf_num);
  push('八门', Object.fromEntries(Object.entries(local.doors).map(([k, v]) => [String(k), v])), chart.doors);
  // 格局按键集合比对；四郭杜为本地依古法增补，上游无此格
  push('格局', Object.keys(local.geJu).filter((k) => k !== '四郭杜').sort(), chart.geju);
  push('纪元', local.jiyuan, chart.jiyuan);
  push('五子元局', local.fiveYuanKook, chart.five_yuan);
  push('阳九', local.yangjiu, chart.yangjiu);
  push('百六', local.bailiu, chart.baliu);
  push('值年卦', local.yearGua, chart.yeargua);
  push('值日卦', local.dayGua, chart.daygua);
  push('值时卦', local.hourGua, chart.hourgua);

  return diffs;
}
