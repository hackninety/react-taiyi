/**
 * kintaiyi 后端对照层测试：compareRemote 的字段映射与黄金用例语义一致。
 * 直接拿 golden.json（kintaiyi 参考实现输出）当「后端响应」——
 * 与本地引擎对照应零漂移；篡改字段应被检出。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { calculateTaiyi } from '../src/taiyi';
import type { AcumYear, JiStyle } from '../src/taiyi';
import { compareRemote } from '../src/taiyi/remote';

interface GoldenCase {
  input: number[]; ji: number; acum: number; error?: string;
  [k: string]: unknown;
}

const golden = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'golden.json'), 'utf-8'),
) as { cases: GoldenCase[] };

const localOf = (c: GoldenCase) => calculateTaiyi({
  year: c.input[0], month: c.input[1], day: c.input[2],
  hour: c.input[3], minute: c.input[4],
  jiStyle: c.ji as JiStyle, acumYear: c.acum as AcumYear,
});

describe('kintaiyi 后端对照层（compareRemote）', () => {
  it('黄金用例当后端响应：全部用例零漂移（known 除外）', () => {
    const valid = golden.cases.filter((c) => !c.error);
    expect(valid.length).toBeGreaterThan(100);
    for (const c of valid) {
      const diffs = compareRemote(localOf(c), c).filter((d) => !d.known);
      expect(diffs, `${c.input.join('-')} ji${c.ji} acum${c.acum}: ${JSON.stringify(diffs)}`)
        .toEqual([]);
    }
  });

  it('篡改字段可被检出并给出可读明细', () => {
    const c = golden.cases.find((x) => !x.error)!;
    const tampered = { ...c, ty: 999, wc: '假' };
    const diffs = compareRemote(localOf(c), tampered).filter((d) => !d.known);
    const fields = diffs.map((d) => d.field);
    expect(fields).toContain('太乙落宫');
    expect(fields).toContain('文昌');
    const ty = diffs.find((d) => d.field === '太乙落宫')!;
    expect(ty.remote).toBe('999');
  });

  it('已知口径差异（节气窗口）标注 known，不算漂移', () => {
    const c = golden.cases.find((x) => !x.error)!;
    const tampered = { ...c, jq: '不存在的节气' };
    const diffs = compareRemote(localOf(c), tampered);
    const jq = diffs.find((d) => d.field === '节气');
    expect(jq).toBeDefined();
    expect(jq!.known).toContain('已知口径差异');
    expect(diffs.filter((d) => !d.known)).toEqual([]);
  });
});
