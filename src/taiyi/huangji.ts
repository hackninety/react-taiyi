/**
 * 皇极经世历（邵雍《皇极经世书》元会运世体系）。
 *
 * 算法与验证数据移植自姊妹项目 react-yhys（algorithms/huangji.ts、zhubi.ts、
 * data/hexagrams64.ts）：
 * - 皇极纪年 = 公历年 + 67017（一元 129,600 年，12 会 × 30 运 × 12 世 × 30 年）
 * - 会辟卦取十二消息卦；运卦 = 会内主卦（先天六十卦序）变爻；世卦 = 运卦变爻
 * - 岁卦分两派：黄畿（运卦→经卦→挨六十卦次）与祝泌《观物篇解》（先天序平推），
 *   两派运卦、世卦一致，仅岁卦口径不同
 * - 月卦/日卦按「日甲月子，合乎为复」以干支配先天六十卦；时卦用十二消息卦
 *
 * 卦名与卦符复用本项目 GUA_64（繁体）；yhys 原表中睽卦（binary 43）的
 * Unicode 笔误已修正（䷤→䷥）。
 */
import { GUA_64 } from './constants';
import { JIAZI, ZHI, mod } from './utils';

export type HuangjiSchool = '黄畿' | '祝泌';

export interface Hexagram {
  binary: number;
  name: string;
  symbol: string;
}

/** binary(初爻为 bit0) -> 卦符（yhys BINARY_TO_UNICODE，修正 43 睽为 ䷥） */
const BINARY_TO_UNICODE: Record<number, string> = {
  0: '䷁', 1: '䷗', 2: '䷆', 3: '䷒', 4: '䷎', 5: '䷣', 6: '䷭', 7: '䷊',
  8: '䷏', 9: '䷲', 10: '䷧', 11: '䷵', 12: '䷽', 13: '䷶', 14: '䷟', 15: '䷡',
  16: '䷇', 17: '䷂', 18: '䷜', 19: '䷻', 20: '䷦', 21: '䷾', 22: '䷯', 23: '䷄',
  24: '䷬', 25: '䷐', 26: '䷮', 27: '䷹', 28: '䷞', 29: '䷰', 30: '䷛', 31: '䷪',
  32: '䷖', 33: '䷚', 34: '䷃', 35: '䷨', 36: '䷳', 37: '䷕', 38: '䷑', 39: '䷙',
  40: '䷢', 41: '䷔', 42: '䷿', 43: '䷥', 44: '䷷', 45: '䷝', 46: '䷱', 47: '䷍',
  48: '䷓', 49: '䷩', 50: '䷺', 51: '䷼', 52: '䷴', 53: '䷤', 54: '䷸', 55: '䷈',
  56: '䷋', 57: '䷘', 58: '䷅', 59: '䷉', 60: '䷠', 61: '䷌', 62: '䷫', 63: '䷀',
};

/** 卦符 -> 繁体卦名（由本项目 GUA_64「名+符」表反查，保证与太乙值卦命名一致） */
const UNICODE_TO_NAME: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const entry of GUA_64) {
    const symbol = entry.slice(-1);
    m.set(symbol, entry.slice(0, -1));
  }
  return m;
})();

export function getHexagram(binary: number): Hexagram {
  const b = binary & 0x3f;
  const symbol = BINARY_TO_UNICODE[b];
  return { binary: b, name: UNICODE_TO_NAME.get(symbol) ?? '?', symbol };
}

/** 爻变（1-6，初爻为 1） */
export function changeYao(binary: number, yao: number): number {
  if (yao < 1 || yao > 6) return binary;
  return (binary ^ (1 << (yao - 1))) & 0x3f;
}

/** 十二辟卦（消息卦），按子丑寅卯辰巳午未申酉戌亥 */
const TWELVE_SOVEREIGN = [1, 3, 7, 15, 31, 63, 62, 60, 56, 48, 32, 0];

/** 四正卦：乾坤坎离（主序列剔除，另作闰卦） */
const FOUR_PRINCIPAL = [63, 0, 18, 45];

/** 先天六十四卦圆图序（自乾顺行；yhys XIANTIAN_64_SEQUENCE_FOR_YUN） */
const XIANTIAN_64 = [
  63, 62, 30, 46, 14, 54, 22, 38, 6, 58, 26, 42, 10, 50, 18, 34,
  2, 60, 28, 44, 12, 52, 20, 36, 4, 56, 24, 40, 8, 48, 16, 32,
  0, 1, 33, 17, 49, 9, 41, 25, 57, 5, 37, 21, 53, 13, 45, 29,
  61, 3, 35, 19, 51, 11, 43, 27, 59, 7, 39, 23, 55, 15, 47, 31,
];

/** 先天六十卦序（剔除四正卦） */
export const XIANTIAN_60: number[] = XIANTIAN_64.filter((b) => !FOUR_PRINCIPAL.includes(b));

/** 变爻得四正卦时回退到六十四卦序定位（yhys findPosIn60） */
function findPosIn60(binary: number): number {
  const pos = XIANTIAN_60.indexOf(binary);
  if (pos >= 0) return pos;
  const pos64 = XIANTIAN_64.indexOf(binary);
  if (pos64 < 0) return 0;
  let principalsBefore = 0;
  for (let i = 0; i < pos64; i++) {
    if (FOUR_PRINCIPAL.includes(XIANTIAN_64[i])) principalsBefore++;
  }
  return pos64 - principalsBefore;
}

const YAO_NAMES = ['初', '二', '三', '四', '五', '上'];

/** 运卦（含主卦与变爻信息）：每会五主卦、每主卦统六运，运卦 = 主卦变第 N 爻 */
function yunHexagramDetail(huiIndex: number, yunInHui: number) {
  const huiStart = ((huiIndex % 12) * 5 + 30) % 60;
  const masterIdx = (huiStart + Math.floor((yunInHui % 30) / 6)) % 60;
  const masterBinary = XIANTIAN_60[masterIdx];
  const yao = (yunInHui % 6) + 1;
  return {
    master: getHexagram(masterBinary),
    yao,
    yaoName: YAO_NAMES[yao - 1],
    hexagram: getHexagram(changeYao(masterBinary, yao)),
  };
}

/** 世卦：运卦变第 floor(世/2)+1 爻（每两世共一甲子） */
function shiHexagram(huiIndex: number, yunInHui: number, shiInYun: number): Hexagram {
  const yun = yunHexagramDetail(huiIndex, yunInHui);
  return getHexagram(changeYao(yun.hexagram.binary, Math.floor(shiInYun / 2) + 1));
}

/** 黄畿岁卦：运卦→经卦（变爻，管六十年）→自经卦位挨六十卦次 */
function suiHexagramHuangji(gregorianYear: number): Hexagram {
  const hj = gregorianYear + 67017;
  const globalShi = Math.ceil(hj / 30);
  const huiIndex = Math.floor((globalShi - 1) / 360) % 12;
  const yunInHui = Math.floor(((globalShi - 1) % 360) / 12);
  const yunHex = yunHexagramDetail(huiIndex, yunInHui).hexagram;

  const yearInYun = hj - (Math.floor((hj - 1) / 360) * 360 + 1); // 0-359
  const jingBinary = changeYao(yunHex.binary, Math.floor(yearInYun / 60) + 1);
  const suiIdx = (findPosIn60(jingBinary) + (yearInYun % 60)) % 60;
  return getHexagram(XIANTIAN_60[suiIdx]);
}

/** 祝泌岁卦：以 1984 甲子年世卦（鼎）在先天六十序之位起，按年偏移平推 */
function suiHexagramZhubi(gregorianYear: number): Hexagram {
  const jiaziHj = 1984 + 67017;
  const jiaziShi = Math.ceil(jiaziHj / 30);
  const huiIndex = Math.floor((jiaziShi - 1) / 360) % 12;
  const shiInHui = (jiaziShi - 1) % 360;
  const shiHex = shiHexagram(huiIndex, Math.floor(shiInHui / 12), shiInHui % 12);

  let start = XIANTIAN_60.indexOf(shiHex.binary);
  if (start < 0) start = 0;
  const offset = mod(gregorianYear - 1984, 60);
  return getHexagram(XIANTIAN_60[(start + offset) % 60]);
}

/** 十年卦（黄畿注）：世卦变爻，前世内三爻、后世外三爻，每卦管十年 */
function tenYearHexagram(hj: number, shiHex: Hexagram) {
  const yearInShi = (hj - 1) % 30;
  const shiInYun = Math.floor((hj - 1) / 30) % 12;
  const yao = (shiInYun % 2) * 3 + Math.floor(yearInShi / 10) + 1;
  return {
    hexagram: getHexagram(changeYao(shiHex.binary, yao)),
    yao,
    yaoName: YAO_NAMES[yao - 1],
  };
}

/** 干支（如「甲子」）在六十甲子中的索引（0-59），无效返回 0 */
function ganzhiIndex(gz: string): number {
  const i = JIAZI.indexOf(gz);
  return i < 0 ? 0 : i;
}

/** 干支配先天六十卦：「日甲月子，合乎为复」——甲子对复卦（六十序索引 30） */
function ganzhiHexagram(gz: string): Hexagram {
  return getHexagram(XIANTIAN_60[(30 + ganzhiIndex(gz)) % 60]);
}

export interface HuangjiInfo {
  school: HuangjiSchool;
  /** 皇极纪年（公历年 + 67017） */
  huangjiYear: number;
  hui: {
    /** 第几会（1-12） */
    ordinal: number;
    /** 会支（子..亥） */
    branch: string;
    /** 辟卦 */
    hexagram: Hexagram;
    /** 年在会内（1-10800） */
    yearInHui: number;
  };
  yun: {
    /** 元内第几运（1-360） */
    global: number;
    hexagram: Hexagram;
    master: Hexagram;
    yaoName: string;
    /** 年在运内（1-360） */
    yearInYun: number;
  };
  shi: {
    /** 元内第几世（1-4320） */
    global: number;
    hexagram: Hexagram;
    /** 年在世内（1-30） */
    yearInShi: number;
  };
  /** 十年卦（黄畿注口径） */
  decade: { hexagram: Hexagram; yaoName: string };
  /** 岁卦（按所选流派） */
  sui: Hexagram;
  /** 另一派岁卦（对照） */
  suiOther: { school: HuangjiSchool; hexagram: Hexagram };
  /** 月卦（按月柱干支） */
  month: Hexagram;
  /** 日卦（按日柱干支） */
  day: Hexagram;
  /** 时卦（十二消息卦按时支） */
  hour: Hexagram;
}

/**
 * 皇极经世历定位。
 * @param year 公历年（岁卦与 yhys 同口径，按公历年份取值）
 * @param pillars 本盘四柱（月柱/日柱/时柱），用于月卦/日卦/时卦
 */
export function calculateHuangji(
  year: number,
  school: HuangjiSchool,
  pillars: { monthGz: string; dayGz: string; hourBranch: string },
): HuangjiInfo {
  const hj = year + 67017;
  const huiIndex = Math.floor((hj - 1) / 10800) % 12;
  const globalYun = Math.floor((hj - 1) / 360) + 1;
  const yunInHui = (globalYun - 1) % 30;
  const globalShi = Math.floor((hj - 1) / 30) + 1;
  const shiInYun = (globalShi - 1) % 12;

  const yunDetail = yunHexagramDetail(huiIndex, yunInHui);
  const shiHex = shiHexagram(huiIndex, yunInHui, shiInYun);
  const decade = tenYearHexagram(hj, shiHex);

  const suiHj = suiHexagramHuangji(year);
  const suiZb = suiHexagramZhubi(year);

  return {
    school,
    huangjiYear: hj,
    hui: {
      ordinal: huiIndex + 1,
      branch: ZHI[huiIndex],
      hexagram: getHexagram(TWELVE_SOVEREIGN[huiIndex]),
      yearInHui: ((hj - 1) % 10800) + 1,
    },
    yun: {
      global: globalYun,
      hexagram: yunDetail.hexagram,
      master: yunDetail.master,
      yaoName: yunDetail.yaoName,
      yearInYun: ((hj - 1) % 360) + 1,
    },
    shi: {
      global: globalShi,
      hexagram: shiHex,
      yearInShi: ((hj - 1) % 30) + 1,
    },
    decade: { hexagram: decade.hexagram, yaoName: decade.yaoName },
    sui: school === '黄畿' ? suiHj : suiZb,
    suiOther: school === '黄畿'
      ? { school: '祝泌', hexagram: suiZb }
      : { school: '黄畿', hexagram: suiHj },
    month: ganzhiHexagram(pillars.monthGz),
    day: ganzhiHexagram(pillars.dayGz),
    hour: getHexagram(TWELVE_SOVEREIGN[mod(ZHI.indexOf(pillars.hourBranch), 12)]),
  };
}
