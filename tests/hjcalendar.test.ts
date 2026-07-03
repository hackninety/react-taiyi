/**
 * 皇极历法拟推口径测试。
 * 1) 交叉验证：1582-10-15 之后（两口径同为格里历）的非节气交接日，
 *    拟推口径与黄金验证的标准口径应给出完全相同的四柱与盘面；
 * 2) 公元前：全跨度可排盘，年柱与史载干支自洽（尧甲辰）。
 */
import { describe, it, expect } from 'vitest';
import { calculateTaiyi } from '../src/taiyi';
import { hjGangzhi, hjJieqi, hjLunar } from '../src/taiyi/huangjiCalendar';

const mk = (year: number, month: number, day: number, hour: number, minute: number) =>
  ({ year, month, day, hour, minute, jiStyle: 3 as const, acumYear: 0 as const });

describe('皇极拟推口径 × 标准口径交叉验证（格里历区间）', () => {
  const dates: Array<[number, number, number, number, number]> = [
    [2026, 7, 3, 14, 30],
    [2000, 6, 15, 8, 0],
    [1984, 5, 20, 10, 0],
    [1850, 7, 15, 6, 40],
  ];

  for (const [y, mo, d, h, mi] of dates) {
    it(`${y}-${mo}-${d} ${h}:${mi} 两口径同盘`, () => {
      const std = calculateTaiyi(mk(y, mo, d, h, mi), 'standard');
      const hj = calculateTaiyi(mk(y, mo, d, h, mi), 'huangji');
      expect(hj.ganzhi, '四柱五柱').toEqual(std.ganzhi);
      expect(hj.jieqi, '节气').toBe(std.jieqi);
      expect(hj.kook.text, '局式').toBe(std.kook.text);
      expect(hj.taiyiGong, '太乙落宫').toBe(std.taiyiGong);
      expect(hj.homeSuan.value, '主算').toBe(std.homeSuan.value);
      expect(hj.awaySuan.value, '客算').toBe(std.awaySuan.value);
      expect(Object.keys(hj.geJu).sort(), '格局').toEqual(Object.keys(std.geJu).sort());
      expect(hj.doors, '八门').toEqual(std.doors);
      expect(hj.calendarMode).toBe('皇极拟推');
      expect(std.calendarMode).toBe('标准');
    });
  }

  it('晚子时进次日与标准口径一致', () => {
    const std = calculateTaiyi(mk(2024, 6, 20, 23, 59), 'standard');
    const hj = calculateTaiyi(mk(2024, 6, 20, 23, 59), 'huangji');
    expect(hj.ganzhi).toEqual(std.ganzhi);
  });
});

describe('皇极拟推口径 · 公元前排盘', () => {
  it('尧甲辰年（公元前 2357 / 天文 -2356）年柱自洽为甲辰，全盘可排', () => {
    const r = calculateTaiyi(mk(-2356, 3, 15, 12, 0), 'huangji');
    expect(r.ganzhi[0]).toBe('甲辰');
    expect(r.kook.num).toBeGreaterThanOrEqual(1);
    expect(r.kook.num).toBeLessThanOrEqual(72);
    expect([1, 2, 3, 4, 6, 7, 8, 9]).toContain(r.taiyiGong);
    expect(Object.keys(r.doors)).toHaveLength(8);
    const allStars = Object.values(r.board).flat();
    expect(allStars).toContain('太乙');
    expect(allStars).toContain('文昌');
    expect(r.yearChin).not.toBe('?');
    expect(r.lunar.text).toContain('皇极拟推');
  });

  it('五计式 × 四流派在公元前不抛错', () => {
    for (const jiStyle of [0, 1, 2, 3, 4] as const) {
      for (const acumYear of [0, 1, 2, 3] as const) {
        const r = calculateTaiyi(
          { year: -2356, month: 3, day: 15, hour: 12, minute: 0, jiStyle, acumYear },
          'huangji',
        );
        expect(r.kook.num).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('拟推历法基元：公元前节气/干支/月建可推', () => {
    expect(hjGangzhi(-2356, 3, 15, 12, 0)).toHaveLength(5);
    expect(hjJieqi(-2356, 3, 15)).toBeTruthy();
    const lunar = hjLunar(-2356, 3, 15);
    expect(lunar.month).toBeGreaterThanOrEqual(1);
    expect(lunar.month).toBeLessThanOrEqual(12);
    expect(lunar.text).toContain('公元前2357年');
  });

  it('跨度极端年份不抛错', () => {
    for (const y of [-67016, -10000, 30000, 62583]) {
      const r = calculateTaiyi(mk(y, 6, 15, 12, 0), 'huangji');
      expect(r.kook.num).toBeGreaterThanOrEqual(1);
    }
  });
});
