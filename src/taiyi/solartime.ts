/**
 * 真太阳时校正。
 *
 * 输入时间视为**浏览器本地时区**的墙上钟时间（而非固定北京时间）：
 *   真太阳时 = 本地时间 − 本地时区偏移 + 经度 × 4 分钟
 * 即校正量 offsetMinutes = 经度×4 − 时区偏移分钟。
 * 例：东京时区（UTC+9，偏移 540）选北京 116.41°E → 465.6 − 540 ≈ −74 分钟；
 *     北京时区（UTC+8）选北京 → 465.6 − 480 ≈ −14 分钟（与旧口径一致）。
 * 均为经度平太阳时，不含 ±15 分钟内的均时差项。
 */

export interface SolarTimeInfo {
  applied: boolean;
  place?: string;
  longitude?: number;
  /** 浏览器时区（IANA 名） */
  timezone?: string;
  /** 输入时刻的本地时区偏移（分钟，东为正，如东京 +540） */
  tzOffsetMinutes?: number;
  offsetMinutes?: number;
  adjusted?: { year: number; month: number; day: number; hour: number; minute: number };
}

/** 浏览器 IANA 时区名（取不到时返回空串） */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

/** 指定墙上钟时刻的本地时区偏移（分钟，东为正；随夏令时变化） */
export function browserTzOffsetMinutes(
  year: number, month: number, day: number, hour: number, minute: number,
): number {
  const d = new Date(2000, month - 1, day, hour, minute);
  d.setFullYear(year + (d.getFullYear() - 2000));
  return -d.getTimezoneOffset();
}

/**
 * 常见 IANA 时区 -> 代表城市与经度（「当前时区（自动）」模式用）。
 * 未收录的时区回退为该时区标准经线（偏移小时 × 15°）。
 */
const TZ_CITY: Record<string, { label: string; longitude: number }> = {
  'Asia/Shanghai': { label: '上海', longitude: 121.47 },
  'Asia/Chongqing': { label: '重庆', longitude: 106.55 },
  'Asia/Urumqi': { label: '乌鲁木齐', longitude: 87.62 },
  'Asia/Hong_Kong': { label: '香港', longitude: 114.17 },
  'Asia/Macau': { label: '澳门', longitude: 113.55 },
  'Asia/Taipei': { label: '台北', longitude: 121.56 },
  'Asia/Tokyo': { label: '东京', longitude: 139.69 },
  'Asia/Seoul': { label: '首尔', longitude: 126.98 },
  'Asia/Pyongyang': { label: '平壤', longitude: 125.75 },
  'Asia/Singapore': { label: '新加坡', longitude: 103.85 },
  'Asia/Kuala_Lumpur': { label: '吉隆坡', longitude: 101.69 },
  'Asia/Bangkok': { label: '曼谷', longitude: 100.5 },
  'Asia/Ho_Chi_Minh': { label: '胡志明市', longitude: 106.63 },
  'Asia/Manila': { label: '马尼拉', longitude: 120.98 },
  'Asia/Jakarta': { label: '雅加达', longitude: 106.85 },
  'Asia/Kolkata': { label: '新德里', longitude: 77.21 },
  'Asia/Dubai': { label: '迪拜', longitude: 55.27 },
  'Australia/Sydney': { label: '悉尼', longitude: 151.21 },
  'Australia/Melbourne': { label: '墨尔本', longitude: 144.96 },
  'Australia/Perth': { label: '珀斯', longitude: 115.86 },
  'Europe/London': { label: '伦敦', longitude: -0.13 },
  'Europe/Paris': { label: '巴黎', longitude: 2.35 },
  'Europe/Berlin': { label: '柏林', longitude: 13.4 },
  'Europe/Moscow': { label: '莫斯科', longitude: 37.62 },
  'America/New_York': { label: '纽约', longitude: -74.01 },
  'America/Chicago': { label: '芝加哥', longitude: -87.63 },
  'America/Denver': { label: '丹佛', longitude: -104.99 },
  'America/Los_Angeles': { label: '洛杉矶', longitude: -118.24 },
  'America/Vancouver': { label: '温哥华', longitude: -123.12 },
  'America/Toronto': { label: '多伦多', longitude: -79.38 },
  'America/Sao_Paulo': { label: '圣保罗', longitude: -46.63 },
  'Pacific/Auckland': { label: '奥克兰', longitude: 174.76 },
};

/**
 * 「当前时区（自动）」定位：按浏览器时区取代表城市经度；
 * 未收录时区回退到该时区标准经线。
 */
export function tzAutoLocation(
  year: number, month: number, day: number, hour: number, minute: number,
): { label: string; longitude: number; timezone: string } {
  const tz = browserTimeZone();
  const hit = TZ_CITY[tz];
  if (hit) return { ...hit, timezone: tz };
  const offset = browserTzOffsetMinutes(year, month, day, hour, minute);
  const meridian = Math.round((offset / 60) * 15 * 100) / 100;
  return {
    label: `${tz || '本地时区'}标准经线`,
    longitude: meridian,
    timezone: tz,
  };
}

/**
 * 真太阳时校正（纯函数）。
 * @param tzOffsetMinutes 输入时刻的本地时区偏移（分钟，东为正）；
 *   UI 传浏览器实际偏移，测试可传固定值（如 480 即旧北京口径）
 */
export function applyTrueSolarTime(
  year: number, month: number, day: number, hour: number, minute: number,
  longitude: number,
  tzOffsetMinutes: number,
): { year: number; month: number; day: number; hour: number; minute: number; offsetMinutes: number } {
  const offsetMinutes = Math.round(longitude * 4 - tzOffsetMinutes);
  const d = new Date(2000, month - 1, day, hour, minute + offsetMinutes);
  d.setFullYear(year + (d.getFullYear() - 2000));
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    offsetMinutes,
  };
}
