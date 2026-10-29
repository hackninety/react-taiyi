import { describe, expect, it } from 'vitest';
import { applyTrueSolarTime } from '../src/taiyi/solartime';
import { calculateTaiyi } from '../src/taiyi/engine';
import { HUANGJI_MIN_YEAR, HUANGJI_MAX_YEAR } from '../src/taiyi/huangji';

describe('地点校正按真实年份进行无宿主时区的日期算术', () => {
  it.each([
    [2023, 3, 1, 2023, 2, 28], [2024, 3, 1, 2024, 2, 29],
    [1900, 3, 1, 1900, 2, 28], [2000, 3, 1, 2000, 2, 29],
    [2024, 1, 1, 2023, 12, 31], [1, 1, 1, 0, 12, 31],
    [0, 3, 1, 0, 2, 29], [-1, 3, 1, -1, 2, 28],
  ])('%s-%s-%s 00:30 向前一小时跨日正确', (year, month, day, y, m, d) => {
    expect(applyTrueSolarTime(year, month, day, 0, 30, 105, 480)).toEqual({
      year: y, month: m, day: d, hour: 23, minute: 30, offsetMinutes: -60,
    });
  });

  it('民用钟表平移不受浏览器所在地夏令时缺口影响', () => {
    // 请同时在 TZ=America/New_York 跑此例；本地 Date 算术会跳过 02:30。
    expect(applyTrueSolarTime(2024, 3, 10, 1, 30, 135, 480)).toEqual({
      year: 2024, month: 3, day: 10, hour: 2, minute: 30, offsetMinutes: 60,
    });
  });

  it('校正后超出标准历法年份时拒绝起盘，不能偷偷换成皇极模式', () => {
    for (const adjusted of [applyTrueSolarTime(600, 1, 1, 0, 30, 105, 480), applyTrueSolarTime(9999, 12, 31, 23, 30, 135, 480)]) {
      expect(() => calculateTaiyi({ ...adjusted, jiStyle: 3, acumYear: 0 }, 'standard')).toThrow('实际排盘年份');
    }
  });

  it('皇极拟推维持完整天文年份范围，并拒绝越界', () => {
    for (const year of [HUANGJI_MIN_YEAR - 1, HUANGJI_MAX_YEAR + 1]) {
      expect(() => calculateTaiyi({ year, month: 6, day: 15, hour: 12, minute: 0, jiStyle: 0, acumYear: 0 }, 'huangji')).toThrow('皇极拟推范围');
    }
  });
});
