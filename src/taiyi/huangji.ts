/**
 * 皇极经世历（邵雍《皇极经世书》元会运世体系）。
 *
 * 算法与卦象数据**完全直接引用**开源库 yhys-core（github:hackninety/react-yhys）——
 * 上游更新后本项目随之更新，无任何本地卦表：卦符笔误已于上游 6f8be11 修复，
 * 繁体卦名自上游 eaf278f 起由库的 nameTrad 字段提供（与太乙值卦繁体命名一致），
 * 本地 unicode 对照表与简→繁显示转换均已删除。
 *
 * 流派校验状态（依 yhys-core 说明）：
 * - 黄畿：已对照《皇极经世书》黄畿注原文校验（84 个文献锚点），为默认。
 * - 祝泌：暂未对照《皇极经世书解》原文，仅经第三方数据交叉验证，选用时须注明「仅供参考」。
 */
import {
  SUI_TO_GREGORIAN_OFFSET,
  getHexagram64,
  getHuiHexagram,
  getYunHexagramDetailByGlobal,
  getShiHexagramByYear,
  getTenYearHexagram,
  getYueHexagram,
  getYueHexagramByDate,
  getRiHexagram,
  getRiHexagramByDate,
  getShiChenHexagram,
  makeLocalDate,
  huangjiAlgorithm,
  zhubiAlgorithm,
} from 'yhys-core';
import { JIAZI, ZHI, mod } from './utils';

export type HuangjiSchool = '黄畿' | '祝泌';

/** 皇极一元跨度对应的公历年范围（sui 1..129600 ↔ 公元前 67016 — 公元 62583） */
export const HUANGJI_MIN_YEAR = 1 - SUI_TO_GREGORIAN_OFFSET;   // -67016
export const HUANGJI_MAX_YEAR = 129600 - SUI_TO_GREGORIAN_OFFSET; // 62583

/** 公历年号的中文表述（天文纪年 0 = 公元前 1 年） */
export function formatGregorianYearCn(year: number): string {
  return year <= 0 ? `公元前 ${1 - year} 年` : `公元 ${year} 年`;
}

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

/** 库卦 -> 本项目卦：binary/卦符/繁体名（nameTrad）全部直接取自 yhys-core */
function toHex(input: number | { binary: number }): Hexagram {
  const h = getHexagram64(typeof input === 'number' ? input : input.binary);
  return {
    binary: h.binary,
    name: h.nameTrad ?? h.name,
    symbol: h.unicode,
  };
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
  month: Hexagram;        // 月卦
  day: Hexagram;          // 日卦
  hour: Hexagram;         // 时卦（十二消息卦按时支）
  /** 月/日/时卦的取数来源：太乙四柱（600–9999 内）或公历日期（全跨度，拟推格里历） */
  monthDayHourSource: '四柱' | '公历日期';
}

/** 月/日/时卦取数来源：太乙盘四柱（范围内首选）或公历日期（皇极全跨度） */
export type HuangjiPillarSource =
  | { monthGz: string; dayGz: string; hourBranch: string }
  | { month: number; day: number; hour: number };

/**
 * 皇极经世历定位。支持一元全跨度（公元前 67016 — 公元 62583）。
 * @param year 公历年（天文纪年，0 = 公元前 1 年；岁卦与 yhys 同口径按年份取值）
 * @param source 月/日/时卦取数来源：太乙四柱，或公历月日时（范围外由 yhys
 *   天文节气按拟推格里历推月建，日卦按纪日干支连续推算）
 */
export function calculateHuangji(
  year: number,
  school: HuangjiSchool,
  source: HuangjiPillarSource,
): HuangjiInfo {
  if (year < HUANGJI_MIN_YEAR || year > HUANGJI_MAX_YEAR) {
    throw new Error(`超出皇极一元跨度（公元前 67016 — 公元 62583），得到 ${year}`);
  }
  const hj = year + SUI_TO_GREGORIAN_OFFSET;
  const huiIndex = Math.floor((hj - 1) / 10800) % 12;
  const globalYun = Math.floor((hj - 1) / 360) + 1;
  const globalShi = Math.floor((hj - 1) / 30) + 1;

  const yunDetail = getYunHexagramDetailByGlobal(globalYun);
  const decade = getTenYearHexagram(hj);

  const suiHuangji = huangjiAlgorithm.getSuiHexagram(year);
  const suiZhubi = zhubiAlgorithm.getSuiHexagram(year);
  const useHuangji = school === '黄畿';

  // 月/日/时卦：四柱来源（与太乙盘同口径）或公历日期来源（全跨度）
  let month: Hexagram;
  let day: Hexagram;
  let hour: Hexagram;
  let monthDayHourSource: HuangjiInfo['monthDayHourSource'];
  if ('monthGz' in source) {
    month = toHex(getYueHexagram(ganzhiIndex(source.monthGz)));
    day = toHex(getRiHexagram(ganzhiIndex(source.dayGz)));
    hour = toHex(getShiChenHexagram(mod(ZHI.indexOf(source.hourBranch), 12)));
    monthDayHourSource = '四柱';
  } else {
    const d = makeLocalDate(year, source.month - 1, source.day);
    month = toHex(getYueHexagramByDate(d));
    day = toHex(getRiHexagramByDate(d));
    hour = toHex(getShiChenHexagram(Math.floor(((source.hour + 1) % 24) / 2)));
    monthDayHourSource = '公历日期';
  }

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
    month,
    day,
    hour,
    monthDayHourSource,
  };
}
