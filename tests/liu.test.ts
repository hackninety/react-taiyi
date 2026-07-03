/**
 * 流卦運多期守卫：fixtures/liu_sample.json 为后端 /api/taiyi/liu 实测样本
 * （2026-07-03 14:30，上游 apps/hex_timeline 推法直出）。
 * 关键对照：各尺度首期 = 起局时刻本身，其卦數必须与 golden.json（kintaiyi
 * 参考实现）同时刻命法卦链 year_gua/month_gua/day_gua/hour_gua/minute_gua 一致
 * —— 锁定「后端 liu 推法 = 上游命法卦链」不漂移。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const liu = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'liu_sample.json'), 'utf-8'),
) as Record<string, Array<Record<string, unknown>>>;

const golden = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'golden.json'), 'utf-8'),
) as { mingfa: Array<Record<string, unknown>> };

const EXPECT_LEN: Record<string, number> = {
  流年: 12, 流月: 12, 流日: 15, 流時: 12, 流分: 10,
};

describe('流卦運多期（/api/taiyi/liu 样本守卫）', () => {
  it('五尺度齐备、期数正确、卦/爻名非空', () => {
    for (const [k, n] of Object.entries(EXPECT_LEN)) {
      expect(liu[k], `缺尺度 ${k}`).toBeDefined();
      expect(liu[k].length, `${k} 期数`).toBe(n);
      for (const row of liu[k]) {
        expect(String(row['卦'])).not.toBe('');
        expect(String(row['爻名'])).toMatch(/^(初|九|六|上)/);
        expect(row['爻']).toBeGreaterThanOrEqual(1);
        expect(row['爻']).toBeLessThanOrEqual(6);
      }
    }
  });

  it('首期即起局时刻（2026-07-03 14:30；流時取时辰代表小时）', () => {
    for (const k of ['流年', '流月', '流日', '流分']) {
      expect(liu[k][0]['時刻'], k).toEqual([2026, 7, 3, 14, 30]);
    }
    // 流時：同一时辰同一卦，上游以时辰代表小时计（14:30 属未时 13-15）
    const [y, m, d, h] = liu['流時'][0]['時刻'] as number[];
    expect([y, m, d]).toEqual([2026, 7, 3]);
    expect(Math.floor((h + 1) / 2) % 12, '首期须同属未时').toBe(Math.floor((14 + 1) / 2) % 12);
    expect(liu['流時'][0]['label']).toBe('未時');
  });

  it('首期卦數与 golden 命法卦链一致（推法零漂移锚点）', () => {
    const mf = golden.mingfa.find((c) =>
      JSON.stringify(c.input) === JSON.stringify([2026, 7, 3, 14, 30]) && c.sex === '男');
    expect(mf, 'golden 中须有 2026-07-03 14:30 命法用例').toBeDefined();
    const pairs: Array<[string, string]> = [
      ['流年', 'year_gua'], ['流月', 'month_gua'], ['流日', 'day_gua'],
      ['流時', 'hour_gua'], ['流分', 'minute_gua'],
    ];
    for (const [scale, key] of pairs) {
      const goldenGua = mf![key] as [number, string];
      expect(liu[scale][0]['卦數'], `${scale} 首期卦數 vs golden ${key}`).toBe(goldenGua[0]);
    }
  });
});
