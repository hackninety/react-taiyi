import { describe, it, expect } from 'vitest';
import { TAIYI_MISHU, getMishu } from '../src/taiyi/mishu';

/**
 * 《太乙秘書》144 局断辞守卫：数据由 scripts/gen_mishu.py 自 kintaiyi taiyimishu.py 生成，
 * 此处锁定完整性与抽样原文（生成器/上游变更时报警）。
 */
describe('太乙秘書 144 局断辞', () => {
  it('陽遁/陰遁各 72 局，断辞与五元干支齐全', () => {
    for (const dun of ['陽', '陰'] as const) {
      const table = TAIYI_MISHU[dun];
      expect(Object.keys(table)).toHaveLength(72);
      for (let n = 1; n <= 72; n++) {
        expect(table[n].text.length, `${dun}遁${n}局断辞`).toBeGreaterThan(30);
        expect(table[n].ganzhi, `${dun}遁${n}局干支`).toMatch(/、/);
      }
    }
  });

  it('抽样对照上游原文', () => {
    // 陽遁第一局（taiyimishu.py yang[1]）
    const y1 = getMishu('陽', 1)!;
    expect(y1.ganzhi).toBe('甲子、丙子、戊子、庚子、壬子');
    expect(y1.text.startsWith('太乙在一宮，天目武德，主算七')).toBe(true);
    expect(y1.text).toContain('利為客');
    // 陽遁第七十二局
    expect(getMishu('陽', 72)!.text).toContain('太乙助客，客算長和');
    // 陰遁第一局
    expect(getMishu('陰', 1)!.text).toContain('主人杜塞無門');
    // 陰遁第七十二局
    expect(getMishu('陰', 72)!.text).toContain('客杜塞無門');
  });

  it('越界查询返回 null', () => {
    expect(getMishu('陽', 0)).toBeNull();
    expect(getMishu('陰', 73)).toBeNull();
  });
});
