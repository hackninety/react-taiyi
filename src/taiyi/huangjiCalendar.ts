/**
 * 皇极历法拟推日历层：太乙历法验证范围（公元 600–9999）之外，
 * 以纯干支算术 + yhys-core 天文节气为太乙引擎提供历法要素，覆盖皇极一元全跨度。
 *
 * 口径说明（与标准层的差异，UI 与导出均须标注）：
 * - 日期一律按**拟推格里历**（proleptic Gregorian）解释，与 yhys 天文节气同一约定
 *   （标准层为对齐 sxtwl 在 1582-10-15 前按儒略历）；
 * - 年柱 = (天文纪年 − 4) mod 60，以立春日为界（日粒度）；
 * - 月柱 = 节气月建（十二节定月）+ 五虎遁；日柱 = 纪日干支连续算术
 *   （锚点 2000-01-01 = 戊午，与 yhys 同源）；时柱五鼠遁、分柱五狗遁，晚子时进次日；
 * - 「农历」为**节气月建拟推**（寅月=正月…），非真实朔望月古历，
 *   仅供积年/积月公式取数，属现代拟推、非古历考据；
 * - 节气为日粒度（阴阳遁按冬至/夏至半年判定，不受影响）。
 */
import { getTermStartDate, SUI_TO_GREGORIAN_OFFSET } from 'yhys-core';
import { normalizeJieqi } from './calendar';
import { rotate, mod, JIAZI, ZHI } from './utils';

export const HUANGJI_CALENDAR_NOTE =
  '皇极历法拟推口径：四柱按纯干支算术＋天文节气推得（拟推格里历），农历为节气月建拟推，非古历考据';

/** 拟推格里历儒略日数（任意年份，含负数年） */
function jdnGregorian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
  );
}

const JDN_2000_01_01 = jdnGregorian(2000, 1, 1);

/** 五虎遁（年干 -> 正月干支起点）/ 五鼠遁 / 五狗遁 */
const FIVE_TIGERS: Record<string, string> = {
  甲: '丙寅', 己: '丙寅', 乙: '戊寅', 庚: '戊寅', 丙: '庚寅',
  辛: '庚寅', 丁: '壬寅', 壬: '壬寅', 戊: '甲寅', 癸: '甲寅',
};
const FIVE_RATS: Record<string, string> = {
  甲: '甲子', 己: '甲子', 乙: '丙子', 庚: '丙子', 丙: '戊子',
  辛: '戊子', 丁: '庚子', 壬: '庚子', 戊: '壬子', 癸: '壬子',
};
const FIVE_DOGS: Record<string, string> = {
  甲: '甲戌', 己: '甲戌', 乙: '丙戌', 庚: '丙戌', 丙: '戊戌',
  辛: '戊戌', 丁: '庚戌', 壬: '庚戌', 戊: '壬戌', 癸: '壬戌',
};

/** yhys 节气索引（0=小寒…23=冬至）中的十二节及其月建 */
const JIE_TO_BRANCH: Array<[number, string]> = [
  [2, '寅'], [4, '卯'], [6, '辰'], [8, '巳'], [10, '午'], [12, '未'],
  [14, '申'], [16, '酉'], [18, '戌'], [20, '亥'], [22, '子'], [0, '丑'],
];

/** yhys 节气名（简体，索引 0=小寒…23=冬至），输出前经 normalizeJieqi 转繁体 */
const TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];

interface TermHit {
  index: number;
  name: string;
  /** 节气当日的拟推格里历 JDN */
  jdn: number;
}

/** 某年某节气的起始日 JDN（yhys 天文算法，日粒度） */
function termJdn(year: number, termIndex: number): number {
  const d = getTermStartDate(year, termIndex);
  return jdnGregorian(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** 目标日所处的节气（最近一个起始日 ≤ 目标日；全 24 节气） */
function currentTerm(jdn: number, year: number): TermHit {
  let best: TermHit = { index: 23, name: TERM_NAMES[23], jdn: -Infinity };
  for (const yy of [year - 1, year]) {
    for (let n = 0; n < 24; n++) {
      const tj = termJdn(yy, n);
      if (tj <= jdn && tj > best.jdn) best = { index: n, name: TERM_NAMES[n], jdn: tj };
    }
  }
  return best;
}

/** 目标日所处的「节」（十二节之一，定月建） */
function currentJie(jdn: number, year: number): { branch: string; jdn: number; jieYear: number } {
  let best = { branch: '丑', jdn: -Infinity, jieYear: year - 1 };
  for (const yy of [year - 1, year]) {
    for (const [idx, branch] of JIE_TO_BRANCH) {
      const tj = termJdn(yy, idx);
      if (tj <= jdn && tj > best.jdn) best = { branch, jdn: tj, jieYear: yy };
    }
  }
  return best;
}

/** 年柱（立春日为界，日粒度）；返回 [干支, 有效年] */
function yearPillar(jdn: number, year: number): [string, number] {
  const lichun = termJdn(year, 2);
  const effYear = jdn >= lichun ? year : year - 1;
  return [JIAZI[mod(effYear - 4, 60)], effYear];
}

/** 日柱（锚点 2000-01-01 = 戊午，索引 54，与 yhys 同源） */
function dayPillar(jdn: number): string {
  return JIAZI[mod(54 + (jdn - JDN_2000_01_01), 60)];
}

/** 拟推格里历日期加一天（处理月末/年末，含负数年） */
function nextDay(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const d = new Date(2000, month - 1, day + 1);
  d.setFullYear(year + (d.getFullYear() - 2000));
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/** 干支五柱 [年, 月, 日, 时, 分]（皇极拟推口径） */
export function hjGangzhi(year: number, month: number, day: number, hour: number, minute: number): string[] {
  // 晚子时（23 点）进次日
  const s = hour === 23 ? { ...nextDay(year, month, day), hour: 0 } : { year, month, day, hour };
  const jdn = jdnGregorian(s.year, s.month, s.day);

  const [yGZ] = yearPillar(jdn, s.year);
  const jie = currentJie(jdn, s.year);
  // 月柱：五虎遁（以月建所属干支年的年干起）
  const [jieYearGz] = yearPillar(jie.jdn, jie.jieYear);
  const monthOrder = '寅卯辰巳午未申酉戌亥子丑';
  const mGZ = rotate(JIAZI, FIVE_TIGERS[jieYearGz[0]])[monthOrder.indexOf(jie.branch)];

  const dGZ = dayPillar(jdn);
  const hourZhi = ZHI[Math.floor((s.hour + 1) / 2) % 12];
  const hGZ = rotate(JIAZI, FIVE_RATS[dGZ[0]])[ZHI.indexOf(hourZhi)];

  // 分柱：以原始日的子时干支起五狗遁（与标准层同规则）
  const rawDayGz = dayPillar(jdnGregorian(year, month, day));
  const ziGZ = rotate(JIAZI, FIVE_RATS[rawDayGz[0]])[0];
  const minGZ = rotate(JIAZI, FIVE_DOGS[ziGZ[0]])[minute % 60];

  return [yGZ, mGZ, dGZ, hGZ, minGZ];
}

/**
 * 拟推「农历」：年取天文纪年、月取节气月建序（寅=正月…丑=十二月）、
 * 日取月建内第几日。仅供积年/积月公式取数，非真实朔望月。
 */
export function hjLunar(year: number, month: number, day: number): {
  year: number; month: number; day: number; text: string;
} {
  const jdn = jdnGregorian(year, month, day);
  const jie = currentJie(jdn, year);
  const monthOrder = '寅卯辰巳午未申酉戌亥子丑';
  const lunarMonth = monthOrder.indexOf(jie.branch) + 1;
  const dayInJie = jdn - jie.jdn + 1;
  const yearCn = year <= 0 ? `公元前${1 - year}年` : `${year}年`;
  return {
    // 农历年号采用 kintaiyi/sxtwl 的「公元前直记」约定（无 0 年：天文 0=前1 → -1），
    // 使 engine 积年公式的 BC 跨零修正（ly<0 ? +1）语义与上游同构——
    // 经 67 条局數史例逐行对照 kintaiyi（tests/examples.test.ts）锁定
    year: year <= 0 ? year - 1 : year,
    month: lunarMonth,
    day: dayInJie,
    text: `皇极拟推 · ${yearCn} 建${jie.branch}月（${lunarMonth}月）第${dayInJie}日`,
  };
}

/** 当前节气名（繁体，日粒度） */
export function hjJieqi(year: number, month: number, day: number): string {
  const term = currentTerm(jdnGregorian(year, month, day), year);
  return normalizeJieqi(term.name);
}

/** 当前节气起始日至当日的天数 + 1（日粒度） */
export function hjJqCountDays(year: number, month: number, day: number): number {
  const jdn = jdnGregorian(year, month, day);
  const term = currentTerm(jdn, year);
  return jdn - term.jdn + 1;
}

/**
 * 拟推格里历积日差（与 hjGangzhi 的日期解释一致；
 * 标准层 daysBetween 在 1582-10-15 前按儒略历，拟推口径统一用格里历）
 */
export function hjDaysBetween(
  year: number, month: number, day: number, hour: number, minute: number,
  refYear: number, refMonth: number, refDay: number,
): number {
  const diff = jdnGregorian(year, month, day) - jdnGregorian(refYear, refMonth, refDay)
    + (hour * 60 + minute) / 1440;
  return Math.trunc(diff);
}

export { SUI_TO_GREGORIAN_OFFSET };
