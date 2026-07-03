/**
 * 历法适配层：用 lunar-typescript 复刻 kintaiyi（sxtwl 版）的
 * 干支（含分柱）、农历、节气语义。
 */
import { Solar, Lunar } from 'lunar-typescript';
import { GAN, ZHI, JIAZI, rotate } from './utils';

/** 简体/常量键 -> 本项目采用的繁体节气名 */
const JIEQI_NORMALIZE: Record<string, string> = {
  DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒', LI_CHUN: '立春',
  YU_SHUI: '雨水', JING_ZHE: '驚蟄', DA_XUE: '大雪',
  惊蛰: '驚蟄', 谷雨: '穀雨', 小满: '小滿', 芒种: '芒種', 处暑: '處暑',
  惊蟄: '驚蟄', 穀雨: '穀雨',
};

export function normalizeJieqi(name: string): string {
  return JIEQI_NORMALIZE[name] ?? name;
}

/**
 * 儒略日数（日粒度）。与 sxtwl.toJD 一致：1582-10-15 之前按儒略历，之后按格里历。
 */
function jdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const common = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
  const gregorian = year > 1582
    || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  if (gregorian) {
    return common - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }
  return common - 32083;
}

/** kintaiyi._days_between：自参考日 0 点至当前时刻的整天数（截断） */
export function daysBetween(
  year: number, month: number, day: number, hour: number, minute: number,
  refYear: number, refMonth: number, refDay: number,
): number {
  const diff = jdn(year, month, day) - jdn(refYear, refMonth, refDay) + (hour * 60 + minute) / 1440;
  return Math.trunc(diff);
}

/** 五虎遁（年干 -> 正月干支起点） */
const FIVE_TIGERS: Record<string, string> = {
  甲: '丙寅', 己: '丙寅', 乙: '戊寅', 庚: '戊寅', 丙: '庚寅',
  辛: '庚寅', 丁: '壬寅', 壬: '壬寅', 戊: '甲寅', 癸: '甲寅',
};
/** 五鼠遁（日干 -> 子时干支起点） */
const FIVE_RATS: Record<string, string> = {
  甲: '甲子', 己: '甲子', 乙: '丙子', 庚: '丙子', 丙: '戊子',
  辛: '戊子', 丁: '庚子', 壬: '庚子', 戊: '壬子', 癸: '壬子',
};
/** 五狗遁（时干 -> 分柱甲戌系起点） */
const FIVE_DOGS: Record<string, string> = {
  甲: '甲戌', 己: '甲戌', 乙: '丙戌', 庚: '丙戌', 丙: '戊戌',
  辛: '戊戌', 丁: '庚戌', 壬: '庚戌', 戊: '壬戌', 癸: '壬戌',
};

function hourBranchIndex(hour: number): number {
  return Math.floor((hour + 1) / 2) % 12;
}

interface Ymd { year: number; month: number; day: number }

/** 晚子时（23 点）进次日，处理月末进位 */
function shiftForLateZi(year: number, month: number, day: number, hour: number): Ymd & { hour: number } {
  if (hour !== 23) return { year, month, day, hour };
  const d = new Date(year, month - 1, day + 1, 0, 0, 0);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: 0 };
}

function lunarOf(year: number, month: number, day: number): Lunar {
  return Solar.fromYmdHms(year, month, day, 0, 0, 0).getLunar();
}

/**
 * 干支五柱 [年, 月, 日, 时, 分]（kintaiyi config.gangzhi）。
 * 年柱以立春为界；月柱以节令为界；23 点起日柱进次日；
 * 分柱以当日子时干支起五狗遁，每分钟进一位、六十分钟一循环。
 */
export function gangzhi(year: number, month: number, day: number, hour: number, minute: number): string[] {
  const s = shiftForLateZi(year, month, day, hour);
  const lunar = lunarOf(s.year, s.month, s.day);

  const yGZ = lunar.getYearInGanZhiByLiChun();
  const mGZ = lunar.getMonthInGanZhi();
  const dGZ = lunar.getDayInGanZhi();

  let mGZ1 = mGZ;
  if (year < 1900) {
    // 早期年份 sxtwl 月柱不可靠，kintaiyi 改用五虎遁按农历月推
    const lunarMonth = Math.abs(lunarOf(year, month, day).getMonth());
    const start = FIVE_TIGERS[yGZ[0]];
    mGZ1 = rotate(JIAZI, start)[(lunarMonth - 1) % 12];
  }

  // 时柱：五鼠遁（用进位后的日干）
  const hourZhi = ZHI[hourBranchIndex(s.hour)];
  const hGZ = rotate(JIAZI, FIVE_RATS[dGZ[0]])[ZHI.indexOf(hourZhi)];

  // 分柱：以「原始日」的子时干支起五狗遁
  const ziGZ = rotate(JIAZI, FIVE_RATS[lunarOf(year, month, day).getDayInGanZhi()[0]])[0];
  const minGZ = rotate(JIAZI, FIVE_DOGS[ziGZ[0]])[minute % 60];

  return [yGZ, mGZ1, dGZ, hGZ, minGZ];
}

/** 农历年月日（kintaiyi config.lunar_date_d；闰月取其月数） */
export function lunarDate(year: number, month: number, day: number): { year: number; month: number; day: number; text: string } {
  const lunar = lunarOf(year, month, day);
  return {
    year: lunar.getYear(),
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    text: lunar.toString(),
  };
}

/** Python 银行家舍入（复刻 kintaiyi 对节气分钟的 round 处理） */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * 当前节气（kintaiyi jieqi.jq）：最近一个「起始时刻 ≤ 当前时刻」的节气名。
 * 与 kintaiyi 一致，节气时刻截断到分钟（小时取整、分钟四舍五入）再比较。
 */
interface JieqiStart {
  name: string;
  /** 含时间的儒略日（分钟粒度，分钟按 kintaiyi 舍入） */
  jd: number;
}

function jdWithTime(year: number, month: number, day: number, hour: number, minute: number): number {
  return jdn(year, month, day) + (hour * 60 + minute) / 1440;
}

function findCurrentJieqi(year: number, month: number, day: number, hour: number, minute: number): JieqiStart {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const table = lunar.getJieQiTable();
  const now = jdWithTime(year, month, day, hour, minute);
  let best: JieqiStart = { name: '', jd: -Infinity };
  for (const key of Object.keys(table)) {
    const solar = table[key];
    const t = jdWithTime(
      solar.getYear(), solar.getMonth(), solar.getDay(),
      solar.getHour(), pyRound(solar.getMinute() + solar.getSecond() / 60),
    );
    if (t <= now && t > best.jd) {
      best = { name: normalizeJieqi(key), jd: t };
    }
  }
  return best;
}

export function currentJieqi(year: number, month: number, day: number, hour: number, minute: number): string {
  return findCurrentJieqi(year, month, day, hour, minute).name;
}

/** kintaiyi jieqi.jq_count_days：当前节气起始至当前时刻的整天数 + 1 */
export function jqCountDays(year: number, month: number, day: number, hour: number, minute: number): number {
  const start = findCurrentJieqi(year, month, day, hour, minute);
  const now = jdWithTime(year, month, day, hour, minute);
  return Math.trunc(now - start.jd) + 1;
}

export { GAN, ZHI, JIAZI };
