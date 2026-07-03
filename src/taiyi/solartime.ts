/**
 * 真太阳时校正（参照 react-8char）：以东经 120° 标准时为基准，
 * 每偏移 1° 经度校正 4 分钟（平太阳时，不含均时差）。
 */

export interface SolarTimeInfo {
  applied: boolean;
  place?: string;
  longitude?: number;
  offsetMinutes?: number;
  adjusted?: { year: number; month: number; day: number; hour: number; minute: number };
}

export function applyTrueSolarTime(
  year: number, month: number, day: number, hour: number, minute: number,
  longitude: number,
): { year: number; month: number; day: number; hour: number; minute: number; offsetMinutes: number } {
  const offsetMinutes = Math.round((longitude - 120) * 4);
  const d = new Date(year, month - 1, day, hour, minute + offsetMinutes);
  // 公元 100 年内 Date 构造器会误映射到 1900 年代；本项目支持范围 ≥600，直接使用
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    offsetMinutes,
  };
}
