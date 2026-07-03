/**
 * kintaiyi 全解释盘（pan）分组守卫：
 * fixtures/pan_sample.json 为后端 /api/taiyi/pan 实测样本（2026-07-03 14:30 时计×统宗，game=true）。
 * - PAN_GROUPS ∪ PAN_IGNORED 必须全覆盖样本键——上游新增键时此测试报警提示归组；
 * - 分组键不得凭空捏造（都要在样本中存在）；
 * - 关键卷子键抽查（統運/卦象/軌運），防上游改名静默漂移。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { PAN_GROUPS, PAN_IGNORED } from '../src/taiyi/pan';

const sample = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'pan_sample.json'), 'utf-8'),
) as Record<string, unknown>;

const grouped = PAN_GROUPS.flatMap((g) => g.keys);

describe('kintaiyi pan 分组守卫', () => {
  it('分组键与忽略键无交集、组内无重复', () => {
    const seen = new Set<string>();
    for (const k of [...grouped, ...PAN_IGNORED]) {
      expect(seen.has(k), `重复归组：${k}`).toBe(false);
      seen.add(k);
    }
  });

  it('分组键均存在于上游样本（防捏造/改名）', () => {
    for (const k of grouped) {
      expect(k in sample, `分组键不存在于上游输出：${k}`).toBe(true);
    }
  });

  it('样本键全覆盖（上游新增键须归组或显式忽略）', () => {
    const known = new Set([...grouped, ...PAN_IGNORED]);
    const unknown = Object.keys(sample).filter((k) => !known.has(k));
    expect(unknown, `上游出现未归组新键：${unknown.join('、')}`).toEqual([]);
  });

  it('統運（卷十二）/卦象（卷十三）/軌運（卷九）关键子键在位', () => {
    const v12 = sample['卷十二'] as Record<string, unknown>;
    for (const k of ['統運入卦', '十二運立成', '入爻禍福', '流年直卦', '災厄首尾', '變卦納甲']) {
      expect(k in v12, `卷十二缺 ${k}`).toBe(true);
    }
    const v13 = sample['卷十三'] as Record<string, unknown>;
    for (const k of ['統運卦象', '卦象全文', '要訣']) {
      expect(k in v13, `卷十三缺 ${k}`).toBe(true);
    }
    const v9 = sample['卷九'] as Record<string, unknown>;
    for (const k of ['大遊軌運', '小遊軌運', '四象之策', '陽九限數', '百六限數']) {
      expect(k in v9, `卷九缺 ${k}`).toBe(true);
    }
    const game = sample['運籌博弈分析'] as Record<string, unknown>;
    expect('支付矩陣' in game && '博弈均衡值' in game).toBe(true);
  });
});
