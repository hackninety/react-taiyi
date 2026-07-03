/**
 * 局數史例「用此年起局」黄金验证。
 * fixtures/examples_verify.json 由 scripts/verify_examples.py 生成：67 条史例
 * 经 kintaiyi（sxtwl 古历，原生支持公元前）按年计 × 四流派实算的局数与年柱。
 *
 * 断言：本应用引擎——公元 600–9999 用标准历法、其余（含全部公元前）用
 * 「皇极历法拟推口径」——的年计局数与年柱**逐行等于上游 kintaiyi**。
 * 这正是史例页「用此年起局」实际走的路径：证明范围外拟推口径的年计与上游同源一致。
 * （对照对象是 kintaiyi 实算值而非史載局數：史載存在「X元第N局」元内序号等文本口径，
 * 与 1–72 连续局编号不同，见 scripts/verify_examples.py 报告。）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { calculateTaiyi } from '../src/taiyi';
import type { AcumYear } from '../src/taiyi';

interface Row {
  year: number;            // 史例约定：负数 = 公元前 N 年（kintaiyi/sxtwl 同约定）
  kook: number;            // 史載局数（仅参考，口径不一）
  年柱: string;
  computed: Record<string, number | string>;  // kintaiyi 年计四流派局数
  matches: string[];
}

const rows = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'examples_verify.json'), 'utf-8'),
) as Row[];

const SCHOOLS: Array<[string, AcumYear]> = [['統宗', 0], ['金鏡', 1], ['淘金歌', 2], ['太乙局', 3]];

/** 史例 -N（公元前 N）→ 本应用输入的天文纪年（0 = 公元前 1 年） */
const toAstronomical = (y: number) => (y < 0 ? y + 1 : y);

describe('局數史例：本应用引擎 vs kintaiyi（含公元前拟推口径）', () => {
  it('67 条史例年计局数与年柱逐行一致（600 外走皇极拟推）', () => {
    expect(rows.length).toBe(67);
    for (const row of rows) {
      const year = toAstronomical(row.year);
      const mode = row.year >= 600 && row.year <= 9999 ? 'standard' : 'huangji';
      for (const [school, acum] of SCHOOLS) {
        const upstream = row.computed[school];
        if (typeof upstream !== 'number') continue; // 上游该派报错则跳过
        const r = calculateTaiyi(
          { year, month: 6, day: 15, hour: 12, minute: 0, jiStyle: 0, acumYear: acum },
          mode,
        );
        expect(r.kook.num, `${row.year} 年（${mode}）${school} 局数`).toBe(upstream);
        expect(r.ganzhi[0], `${row.year} 年柱`).toBe(row.年柱);
      }
    }
  });

  it('史載局数直接命中率与流派分布（记录性断言）', () => {
    const hit = rows.filter((r) => r.matches.length > 0);
    // kintaiyi 实算对史載的直接命中 59/67（未中者属史載元内序号口径/传抄，见脚本报告）
    expect(hit.length).toBeGreaterThanOrEqual(59);
    // -578「丙子元第八局」为元内序号口径：丙子起数至癸未恰为第 8 位
    const shou = rows.find((r) => r.year === -578)!;
    expect(shou.年柱).toBe('癸未');
    const JIAZI_INDEX: Record<string, number> = { 丙子: 12, 癸未: 19 };
    expect(JIAZI_INDEX['癸未'] - JIAZI_INDEX['丙子'] + 1).toBe(shou.kook);
  });
});
