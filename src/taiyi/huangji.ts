/**
 * 皇极经世历（邵雍《皇极经世书》元会运世体系）。
 *
 * 算法**直接引用**开源库 yhys-core（github:hackninety/react-yhys）——
 * 上游更新算法后本项目随之更新，不再本地内联。
 * 本文件只做两件事：① 用库函数按元会运世逐层取卦；② 把库返回卦的 binary
 * 映射为本项目统一的繁体卦名与卦符（库的 unicode 字段个别有笔误，故不取用）。
 *
 * 流派校验状态（依 yhys-core 说明）：
 * - 黄畿：已对照《皇极经世书》黄畿注原文校验（84 个文献锚点），为默认。
 * - 祝泌：暂未对照《皇极经世书解》原文，仅经第三方数据交叉验证，选用时须注明「仅供参考」。
 */
import {
  SUI_TO_GREGORIAN_OFFSET,
  getHuiHexagram,
  getYunHexagramDetailByGlobal,
  getShiHexagramByYear,
  getTenYearHexagram,
  getYueHexagram,
  getRiHexagram,
  getShiChenHexagram,
  huangjiAlgorithm,
  zhubiAlgorithm,
} from 'yhys-core';
import { GUA_64 } from './constants';
import { JIAZI, ZHI, mod } from './utils';

export type HuangjiSchool = '黄畿' | '祝泌';

export interface Hexagram {
  binary: number;
  name: string;
  symbol: string;
}

/** 各流派原文校验状态与备注（供 UI / 导出标注，防止流派错乱） */
export const HUANGJI_SCHOOL_NOTE: Record<HuangjiSchool, string> = {
  黄畿: '已对照《皇极经世书》黄畿注原文校验（84 个文献锚点），为默认算法',
  祝泌: '暂未对照《皇极经世书解》原文，仅经第三方数据交叉验证，结果仅供参考',
};

export const HUANGJI_DEFAULT_SCHOOL: HuangjiSchool = '黄畿';

/**
 * binary(初爻为 bit0) -> 卦符。
 * 与 yhys 同源，但修正其 binary 43（睽）的 Unicode 笔误（䷤→䷥）。
 */
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

/** 卦符 -> 繁体卦名（由本项目 GUA_64「名+符」反查，与太乙值卦命名保持一致） */
const UNICODE_TO_NAME: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const entry of GUA_64) m.set(entry.slice(-1), entry.slice(0, -1));
  return m;
})();

/** 把 yhys 返回卦（或 binary）本地化为繁体卦名 + 正确卦符 */
function toHex(input: number | { binary: number }): Hexagram {
  const binary = (typeof input === 'number' ? input : input.binary) & 0x3f;
  const symbol = BINARY_TO_UNICODE[binary];
  return { binary, name: UNICODE_TO_NAME.get(symbol) ?? '?', symbol };
}

function ganzhiIndex(gz: string): number {
  const i = JIAZI.indexOf(gz);
  return i < 0 ? 0 : i;
}

export interface HuangjiInfo {
  school: HuangjiSchool;
  /** 所选流派的校验状态备注 */
  schoolNote: string;
  /** 皇极纪年（公历年 + 67017） */
  huangjiYear: number;
  hui: {
    ordinal: number;      // 第几会（1-12）
    branch: string;       // 会支（子..亥）
    hexagram: Hexagram;   // 辟卦
    yearInHui: number;    // 年在会内（1-10800）
  };
  yun: {
    global: number;       // 元内第几运（1-360）
    hexagram: Hexagram;
    master: Hexagram;     // 主卦（变卦来源）
    yaoName: string;      // 变爻（初..上）
    yearInYun: number;    // 年在运内（1-360）
  };
  shi: {
    global: number;       // 元内第几世（1-4320）
    hexagram: Hexagram;
    yearInShi: number;    // 年在世内（1-30）
  };
  decade: { hexagram: Hexagram; yaoName: string };  // 十年卦（黄畿注口径）
  sui: Hexagram;          // 岁卦（按所选流派）
  suiOther: { school: HuangjiSchool; hexagram: Hexagram };  // 另一派岁卦（对照）
  month: Hexagram;        // 月卦（按月柱干支）
  day: Hexagram;          // 日卦（按日柱干支）
  hour: Hexagram;         // 时卦（十二消息卦按时支）
}

/**
 * 皇极经世历定位。
 * @param year 公历年（岁卦与 yhys 同口径，按公历年份取值）
 * @param pillars 本盘四柱（月柱/日柱/时支），用于月卦/日卦/时卦
 */
export function calculateHuangji(
  year: number,
  school: HuangjiSchool,
  pillars: { monthGz: string; dayGz: string; hourBranch: string },
): HuangjiInfo {
  const hj = year + SUI_TO_GREGORIAN_OFFSET;
  const huiIndex = Math.floor((hj - 1) / 10800) % 12;
  const globalYun = Math.floor((hj - 1) / 360) + 1;
  const globalShi = Math.floor((hj - 1) / 30) + 1;

  const yunDetail = getYunHexagramDetailByGlobal(globalYun);
  const decade = getTenYearHexagram(hj);

  const suiHuangji = huangjiAlgorithm.getSuiHexagram(year);
  const suiZhubi = zhubiAlgorithm.getSuiHexagram(year);
  const useHuangji = school === '黄畿';

  return {
    school,
    schoolNote: HUANGJI_SCHOOL_NOTE[school],
    huangjiYear: hj,
    hui: {
      ordinal: huiIndex + 1,
      branch: ZHI[huiIndex],
      hexagram: toHex(getHuiHexagram(huiIndex)),
      yearInHui: ((hj - 1) % 10800) + 1,
    },
    yun: {
      global: globalYun,
      hexagram: toHex(yunDetail.yunHexagram),
      master: toHex(yunDetail.masterHexagram),
      yaoName: yunDetail.yaoName,
      yearInYun: ((hj - 1) % 360) + 1,
    },
    shi: {
      global: globalShi,
      hexagram: toHex(getShiHexagramByYear(hj)),
      yearInShi: ((hj - 1) % 30) + 1,
    },
    decade: { hexagram: toHex(decade.hex), yaoName: decade.yaoName },
    sui: toHex(useHuangji ? suiHuangji : suiZhubi),
    suiOther: useHuangji
      ? { school: '祝泌', hexagram: toHex(suiZhubi) }
      : { school: '黄畿', hexagram: toHex(suiHuangji) },
    month: toHex(getYueHexagram(ganzhiIndex(pillars.monthGz))),
    day: toHex(getRiHexagram(ganzhiIndex(pillars.dayGz))),
    hour: toHex(getShiChenHexagram(mod(ZHI.indexOf(pillars.hourBranch), 12))),
  };
}
