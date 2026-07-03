/**
 * 通用工具 — 对应 kintaiyi config.py 中的 new_list / multi_key_dict_get 等。
 * 注意保持与 Python 语义一致（如 `x % n or n`、int() 截断）。
 */

/** 把数组旋转到以元素 o 开头（Python new_list） */
export function rotate<T>(list: readonly T[], o: T): T[] {
  const i = list.indexOf(o);
  if (i < 0) throw new Error(`rotate: ${String(o)} 不在列表中`);
  return [...list.slice(i), ...list.slice(0, i)];
}

/** Python 的 `x % n or n`：余数为 0 时取 n（一至 n 循环计数）。
 * 与 Python 一致对负数取正余（皇极全跨度的公元前年份会出现负输入）。 */
export function modOr(x: number, n: number): number {
  const r = ((x % n) + n) % n;
  return r === 0 ? n : r;
}

/** 严格正余数 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** 从 keys/values 建 Map（zip 截断到较短者） */
export function zipMap<K, V>(keys: readonly K[], values: readonly V[]): Map<K, V> {
  const m = new Map<K, V>();
  const n = Math.min(keys.length, values.length);
  for (let i = 0; i < n; i++) m.set(keys[i], values[i]);
  return m;
}

/** 1..n 与 values 对位（dict(zip(range(1, n+1), values))），按 1 起序号取值 */
export function byIndex1<V>(values: readonly V[], idx: number): V | undefined {
  return idx >= 1 && idx <= values.length ? values[idx - 1] : undefined;
}

/** 1..72 序号在 values 上循环取值（dict(zip(range(1,73), cycle(values)))） */
export function byCycle1<V>(values: readonly V[], idx: number): V | undefined {
  if (idx < 1) return undefined;
  return values[(idx - 1) % values.length];
}

/** kintaiyi config.divide：反复整除直到除不尽 */
export function divide(num: number, divisionNum: number): number {
  if (!Number.isInteger(num) || num <= 0) return num;
  while (num % divisionNum === 0) num = Math.floor(num / divisionNum);
  return num;
}

/** 六十甲子表 */
export const GAN = '甲乙丙丁戊己庚辛壬癸';
export const ZHI = '子丑寅卯辰巳午未申酉戌亥';

export const JIAZI: string[] = Array.from({ length: 60 }, (_, x) => `${GAN[x % 10]}${ZHI[x % 12]}`);
