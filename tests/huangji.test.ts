/**
 * 皇极经世历对照测试。
 * 锚点数据来自 react-yhys：zhubi.ts 注释中经多来源交叉确认的岁卦序列
 * （1984=鼎 … 2026=同人），以及 hexagrams64.ts 午会运卦映射表（运181-210）。
 */
import { describe, it, expect } from 'vitest';
import { getHexagram64 } from 'yhys-core';
import { calculateHuangji } from '../src/taiyi/huangji';

const PILLARS = { monthGz: '甲午', dayGz: '戊寅', hourBranch: '未' };

const hj = (year: number, school: '黄畿' | '祝泌' = '祝泌') =>
  calculateHuangji(year, school, PILLARS);

describe('yhys-core 上游数据守卫', () => {
  it('卦符表无错位（睽䷥/家人䷤，上游 6f8be11 修复的回归锁）', () => {
    expect(getHexagram64(43).name).toBe('睽');
    expect(getHexagram64(43).unicode).toBe('䷥');
    expect(getHexagram64(53).name).toBe('家人');
    expect(getHexagram64(53).unicode).toBe('䷤');
    // 全表卦符唯一性：64 卦不得有重复符号
    const symbols = new Set(Array.from({ length: 64 }, (_, b) => getHexagram64(b).unicode));
    expect(symbols.size).toBe(64);
  });

  it('繁体卦名字段 nameTrad（上游 eaf278f 新增）抽查与唯一性', () => {
    expect(getHexagram64(1).nameTrad).toBe('復');
    expect(getHexagram64(11).nameTrad).toBe('歸妹');
    expect(getHexagram64(57).nameTrad).toBe('無妄');
    expect(getHexagram64(60).nameTrad).toBe('遯');
    expect(getHexagram64(30).nameTrad).toBe('大過');
    const names = new Set(Array.from({ length: 64 }, (_, b) => getHexagram64(b).nameTrad));
    expect(names.size).toBe(64);
  });
});

describe('皇极经世历', () => {
  it('2026 年元会运世定位（午会 · 运192 · 世卦鼎）', () => {
    const h = hj(2026);
    expect(h.huangjiYear).toBe(69043);
    expect(h.hui.branch).toBe('午');
    expect(h.hui.ordinal).toBe(7);
    expect(h.hui.hexagram.name).toBe('姤');
    // 午会运192 = 主卦大过变上爻 → 姤（yhys 午会映射表验证点）
    expect(h.yun.global).toBe(192);
    expect(h.yun.master.name).toBe('大過');
    expect(h.yun.yaoName).toBe('上');
    expect(h.yun.hexagram.name).toBe('姤');
    expect(h.shi.hexagram.name).toBe('鼎');
  });

  it('祝泌岁卦序列（yhys 交叉验证锚点）', () => {
    const expected: Array<[number, string]> = [
      [1984, '鼎'], [1985, '恆'], [1986, '巽'], [1987, '井'], [1988, '蠱'],
      [1994, '渙'], [1995, '蒙'], [1996, '師'], [1997, '遯'], [1998, '咸'],
      [1999, '旅'], [2000, '小過'], [2001, '漸'], [2002, '蹇'], [2003, '艮'],
      [2025, '革'], [2026, '同人'],
    ];
    for (const [year, name] of expected) {
      expect(hj(year, '祝泌').sui.name, `${year} 祝泌岁卦`).toBe(name);
    }
  });

  it('黄畿岁卦：甲子锚点同鼎，其他甲子周期与祝泌分歧', () => {
    expect(hj(1984, '黄畿').sui.name).toBe('鼎');
    // 1984-2043 周期内经卦与世卦重合，两派一致
    expect(hj(2026, '黄畿').sui.name).toBe('同人');
    // 1924-1983 周期：黄畿经卦为巽（姤变四爻），起于巽；祝泌仍自鼎平推
    expect(hj(1924, '黄畿').sui.name).toBe('巽');
    expect(hj(1924, '祝泌').sui.name).toBe('鼎');
    // 面板对照字段
    const h = hj(1924, '黄畿');
    expect(h.suiOther.school).toBe('祝泌');
    expect(h.suiOther.hexagram.name).toBe('鼎');
  });

  it('月卦日卦按「甲子对复」起，时卦取消息卦', () => {
    const h = calculateHuangji(2026, '祝泌', { monthGz: '甲子', dayGz: '甲子', hourBranch: '子' });
    expect(h.month.name).toBe('復');
    expect(h.day.name).toBe('復');
    expect(h.hour.name).toBe('復');
    const h2 = calculateHuangji(2026, '祝泌', { monthGz: '乙丑', dayGz: '丙寅', hourBranch: '午' });
    expect(h2.month.name).toBe('頤'); // 甲子后一位
    expect(h2.hour.name).toBe('姤');  // 午时消息卦
  });

  it('十二会辟卦轮转（子会复、亥会坤）', () => {
    // 公元前 67017 年为皇极元年（子会第 1 年）
    const first = calculateHuangji(-67016, '祝泌', PILLARS);
    expect(first.huangjiYear).toBe(1);
    expect(first.hui.branch).toBe('子');
    expect(first.hui.hexagram.name).toBe('復');
    expect(first.yun.global).toBe(1);
    expect(first.shi.global).toBe(1);
  });

  it('公元前文献锚点（yhys 黄畿注校验点：尧甲辰=隨、孔子庚戌=履）', () => {
    // 尧即位甲辰 = 公元前 2357 年（天文纪年 -2356）
    const yao = calculateHuangji(-2356, '黄畿', { month: 3, day: 15, hour: 12 });
    expect(yao.sui.name).toBe('隨');
    expect(yao.monthDayHourSource).toBe('公历日期');
    expect(yao.month.name).not.toBe('?');
    expect(yao.day.name).not.toBe('?');
    expect(yao.hour.name).toBe('姤'); // 午时消息卦
    // 孔子生庚戌 = 公元前 551 年（天文纪年 -550）
    expect(calculateHuangji(-550, '黄畿', { month: 9, day: 28, hour: 8 }).sui.name).toBe('履');
  });

  it('一元跨度两端与越界', () => {
    const first = calculateHuangji(-67016, '黄畿', { month: 1, day: 1, hour: 0 });
    expect(first.huangjiYear).toBe(1);
    expect(first.hui.ordinal).toBe(1);
    expect(first.sui.name).toBe('復');
    const last = calculateHuangji(62583, '黄畿', { month: 12, day: 31, hour: 23 });
    expect(last.huangjiYear).toBe(129600);
    expect(last.hui.ordinal).toBe(12);
    expect(last.hui.branch).toBe('亥');
    expect(last.shi.global).toBe(4320);
    expect(last.shi.yearInShi).toBe(30);
    expect(() => calculateHuangji(-67017, '黄畿', { month: 1, day: 1, hour: 0 })).toThrow();
    expect(() => calculateHuangji(62584, '黄畿', { month: 1, day: 1, hour: 0 })).toThrow();
  });

  it('600–9999 全范围不抛错且层级自洽', () => {
    for (const year of [600, 1000, 1582, 1900, 2500, 5000, 9999]) {
      const h = hj(year);
      expect(h.hui.ordinal).toBeGreaterThanOrEqual(1);
      expect(h.hui.ordinal).toBeLessThanOrEqual(12);
      expect(h.yun.global).toBeGreaterThanOrEqual(1);
      expect(h.yun.global).toBeLessThanOrEqual(360);
      expect(h.shi.yearInShi).toBeGreaterThanOrEqual(1);
      expect(h.shi.yearInShi).toBeLessThanOrEqual(30);
      expect(h.sui.name).not.toBe('?');
      expect(h.decade.hexagram.name).not.toBe('?');
    }
  });
});
