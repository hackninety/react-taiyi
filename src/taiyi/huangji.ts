/**
 * 皇极经世历（邵雍《皇极经世书》元会运世体系）。
 *
 * 算法与卦象数据**完全直接引用**开源库 yhys-core（github:hackninety/react-yhys）——
 * 上游更新后本项目随之更新，无任何本地卦表：卦符笔误已于上游 6f8be11 修复，
 * 繁体卦名自上游 eaf278f 起由库的 nameTrad 字段提供（与太乙值卦繁体命名一致）。
 *
 * 元会运世（会/运/世/十年/岁）按公历年直接定位；岁以下的月/日/时卦采用
 * **黄畿「岁卦逐层变爻·挨卦」的纯正推法**（huangjiAlgorithm 子年卦函数群）：
 *   岁卦 → 月经卦（变爻，每卦管 60 日=双月，"一六为经"）
 *        → 旬纬卦（月经卦变爻，每卦管 10 日=一旬，"六六为纬"）
 *        → 日卦（月经卦位置起挨六十卦次，每日一卦）
 *        → 时经卦（日卦变爻，每 2 时辰一卦，自子半 0 点起分六段）
 * 需年内天数（1-360，冬至为岁首第 1 日）——由库 getSolarTerm().huangji.dayOfYear 提供，
 * 皇极以「冬至换岁」，故先按冬至判定所属皇极年再取卦。
 *
 * 流派：**仅用黄畿**（已对照《皇极经世书》黄畿注原文校验，84 个文献锚点）。
 * 祝泌派暂未对照《皇极经世书解》原文，依用户决定（2026-07）关闭不用；
 * 库中 zhubiAlgorithm 仍存在，如日后校订完成可再启用对照。
 */
import {
  SUI_TO_GREGORIAN_OFFSET,
  getHexagram64,
  getHuiHexagram,
  getYunHexagramDetailByGlobal,
  getShiHexagramByYear,
  getTenYearHexagram,
  getSolarTerm,
  getTermStartDate,
  makeLocalDate,
  huangjiAlgorithm,
} from 'yhys-core';
import { ZHI } from './utils';

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

/** 算法口径说明（供 UI / 导出标注） */
export const HUANGJI_ALGORITHM_NOTE =
  '黄畿派——已对照《皇极经世书》黄畿注原文校验（84 个文献锚点）；祝泌派未对照原文，已关闭不用';

/** 子年卦（月经/旬纬/日/时经）口径说明 */
export const HUANGJI_SUBYEAR_NOTE =
  '黄畿「岁卦逐层变爻·挨卦」推演（冬至换岁：月经卦60日/双月、旬纬卦10日/旬、日卦一日一卦、时经卦2时辰一卦）';

/** 库卦 -> 本项目卦：binary/卦符/繁体名（nameTrad）全部直接取自 yhys-core */
function toHex(input: number | { binary: number }): Hexagram {
  const h = getHexagram64(typeof input === 'number' ? input : input.binary);
  return {
    binary: h.binary,
    name: h.nameTrad ?? h.name,
    symbol: h.unicode,
  };
}

export interface HuangjiInfo {
  /** 岁卦算法（固定黄畿）及校验状态备注 */
  algorithm: '黄畿';
  algorithmNote: string;
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
  sui: Hexagram;          // 岁卦（黄畿）
  /** 皇极年内第几日（1-360，冬至为岁首第 1 日） */
  dayOfYear: number;
  yueJing: Hexagram;      // 月经卦（岁卦变爻，每卦管 60 日=双月）
  xunWei: Hexagram;       // 旬纬卦（月经卦变爻，每卦管 10 日=一旬）
  day: Hexagram;          // 日卦（月经卦位置起挨六十卦次，每日一卦）
  shiJing: Hexagram;      // 时经卦（日卦变爻，每 2 时辰一卦，自子半起）
  /** 月/日/时卦口径说明 */
  subYearNote: string;
}

/** 月/日/时卦取数来源：公历月日时（皇极全跨度，冬至换岁定位年内天数） */
export type HuangjiPillarSource = { month: number; day: number; hour: number };

/**
 * 皇极经世历定位。支持一元全跨度（公元前 67016 — 公元 62583）。
 * @param year 公历年（天文纪年，0 = 公元前 1 年）
 * @param source 公历月日时——用于按冬至换岁定位皇极年内天数，
 *   再由黄畿子年卦函数群逐层推演月经/旬纬/日/时经卦
 */
export function calculateHuangji(
  year: number,
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

  // —— 岁以下月/日/时卦：黄畿「岁卦逐层变爻·挨卦」纯正推法 ——
  // 皇极以冬至换岁：先判定所属皇极年（冬至后归次年），再取年内天数（1-360）。
  const civil = makeLocalDate(year, source.month - 1, source.day);
  const dongzhi = getTermStartDate(year, 23);            // 本公历年冬至（节气索引 23）
  const subYear = civil.getTime() >= dongzhi.getTime() ? year + 1 : year;
  const dayOfYear = getSolarTerm(civil).huangji.dayOfYear;  // 1-360，自冬至起
  const hour = ((source.hour % 24) + 24) % 24;

  return {
    algorithm: '黄畿',
    algorithmNote: HUANGJI_ALGORITHM_NOTE,
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
    sui: toHex(huangjiAlgorithm.getSuiHexagram(year)),
    dayOfYear,
    yueJing: toHex(huangjiAlgorithm.getYueJingHexagram!(subYear, dayOfYear)),
    xunWei: toHex(huangjiAlgorithm.getXunWeiHexagram!(subYear, dayOfYear)),
    day: toHex(huangjiAlgorithm.getRiHexagram!(subYear, dayOfYear)),
    shiJing: toHex(huangjiAlgorithm.getShiJingHexagram!(subYear, dayOfYear, hour)),
    subYearNote: HUANGJI_SUBYEAR_NOTE,
  };
}
