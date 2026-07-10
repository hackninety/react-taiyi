/**
 * 十精入宿（七曜落位）：kintaiyi find_stars 的查表移植。
 * 数据 public/data/stars_data.json（约 3MB，kintaiyi 预计算表，MIT），
 * 键 "YYYY-MM-DD"，值为七字符串，依次为日/月/辰星/太白/熒惑/歲星/填星所落地支。
 * 1900 年前为每月精度（取月初值）。
 */
import { PLANET_KEYS } from './constants';

export type StarsTable = Record<string, string>;

let table: StarsTable | null = null;
let loading: Promise<StarsTable> | null = null;

export function starsLoaded(): boolean {
  return table !== null;
}

/** 直接注入预加载的十精表（Node/MCP 场景：浏览器 fetch 不可用，由调用方 fs 读入） */
export function setStarsData(data: StarsTable): void {
  table = data;
}

export async function loadStarsData(url = `${import.meta.env.BASE_URL}data/stars_data.json`): Promise<StarsTable> {
  if (table) return table;
  loading ??= fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`十精数据加载失败：HTTP ${res.status}`);
    table = await res.json() as StarsTable;
    return table;
  }).catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/**
 * 七曜落支（kintaiyi find_stars 的回退链：当日 -> 当月初 -> 当年任一月初）。
 * 返回 地支 -> 行星名列表；数据缺失返回 null。
 */
export function findStars(year: number, month: number, day: number): Record<string, string[]> | null {
  if (!table) return null;
  let compact = table[`${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`];
  compact ??= table[`${pad(year, 4)}-${pad(month, 2)}-01`];
  if (!compact) {
    for (let m = 1; m <= 12; m++) {
      compact = table[`${pad(year, 4)}-${pad(m, 2)}-01`];
      if (compact) break;
    }
  }
  if (!compact) return null;
  const byChen: Record<string, string[]> = {};
  [...compact].forEach((zhi, i) => {
    if (PLANET_KEYS[i]) (byChen[zhi] ??= []).push(PLANET_KEYS[i]);
  });
  return byChen;
}
