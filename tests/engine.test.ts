/**
 * 黄金用例对照测试：tests/fixtures/golden.json 由 scripts/gen_fixtures.py
 * 用 kintaiyi（Python 参考实现）生成，逐字段核对 TS 引擎。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TaiyiEngine } from '../src/taiyi/engine';
import { calculateMingfa } from '../src/taiyi/mingfa';
import type { Sex } from '../src/taiyi/mingfa';
import type { AcumYear, JiStyle } from '../src/taiyi/types';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'golden.json');

interface GoldenCase {
  input: [number, number, number, number, number];
  ji: JiStyle;
  acum: AcumYear;
  error?: string;
  gz?: string[];
  lunar?: [number, number, number];
  jq?: string;
  acc?: number;
  kook_text?: string;
  kook_num?: number;
  kook_year?: string;
  ty?: number;
  wc?: string;
  wc_des?: string;
  sf?: string;
  se?: string;
  jigod?: string;
  hegod?: string;
  taishui?: string;
  home_cal?: number;
  home_g?: number;
  home_v?: number;
  away_cal?: number;
  away_g?: number;
  away_v?: number;
  set_cal?: number;
  set_g?: number;
  set_v?: number;
  kingbase?: string;
  officerbase?: string;
  pplbase?: string;
  fgd?: string;
  skyyi?: string;
  earthyi?: string;
  zhifu?: string;
  flyfu?: string;
  doors?: Record<string, string>;
  geju?: string[];
  jiyuan?: string;
  five_yuan?: string;
  yangjiu?: string;
  baliu?: string;
  yeargua?: string;
  daygua?: string;
  hourgua?: string;
  year_chin?: string;
  sf_num?: string;
  tian_wang?: string | null;
  tian_shi?: string | null;
  wuxing_god?: string | null;
  kingfu?: string | null;
  taijun?: string | null;
  wufu?: number;
  threewind?: number | null;
  fivewind?: number | null;
  eightwind?: number | null;
  flybird?: number | string | null;
  bigyo?: number | null;
  smyo?: number | null;
}

interface MingfaCase {
  input: [number, number, number, number, number];
  sex: Sex;
  as_of?: [number, number, number];
  error?: string;
  life_accum?: number;
  three_cai?: [number, number, number];
  twelve_palaces?: Record<string, string>;
  yangjiu_xingxian?: Array<[string, string]>;
  bailiu_xingxian?: Array<[string, string]>;
  souqi_num?: number;
  shouqi_ganzhi?: string;
  life_start_gua?: [number, string | null];
  year_gua?: [number, string | null];
  month_gua?: [number, string | null];
  day_gua?: [number, string | null];
  hour_gua?: [number, string | null];
  minute_gua?: [number, string | null];
}

const hasFixtures = existsSync(FIXTURE);
const rawFixture: unknown = hasFixtures ? JSON.parse(readFileSync(FIXTURE, 'utf-8')) : null;
const cases: GoldenCase[] = rawFixture
  ? (Array.isArray(rawFixture) ? rawFixture : (rawFixture as { cases: GoldenCase[] }).cases)
  : [];
const mingfaCases: MingfaCase[] = rawFixture && !Array.isArray(rawFixture)
  ? (rawFixture as { mingfa?: MingfaCase[] }).mingfa ?? []
  : [];

describe('太乙引擎烟雾测试', () => {
  it('时计排盘可运行且字段自洽', async () => {
    const { calculateTaiyi } = await import('../src/taiyi');
    const r = calculateTaiyi({ year: 2026, month: 7, day: 3, hour: 14, minute: 30, jiStyle: 3, acumYear: 0 });
    expect(r.kook.num).toBeGreaterThanOrEqual(1);
    expect(r.kook.num).toBeLessThanOrEqual(72);
    expect([1, 2, 3, 4, 6, 7, 8, 9]).toContain(r.taiyiGong);
    expect(r.ganzhi).toHaveLength(5);
    expect(Object.keys(r.doors)).toHaveLength(8);
    expect(r.board['中']).toBeDefined();
    // 太乙必上盘
    const allStars = Object.values(r.board).flat();
    expect(allStars).toContain('太乙');
    expect(allStars).toContain('文昌');
  });

  it('五计式 × 四流派全组合不抛错', async () => {
    const { calculateTaiyi } = await import('../src/taiyi');
    for (const jiStyle of [0, 1, 2, 3, 4] as const) {
      for (const acumYear of [0, 1, 2, 3] as const) {
        const r = calculateTaiyi({ year: 2026, month: 7, day: 3, hour: 14, minute: 30, jiStyle, acumYear });
        expect(r.kook.num).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe.skipIf(!hasFixtures)('kintaiyi 黄金用例对照', () => {
  const valid = cases.filter((c) => !c.error);

  it(`共 ${valid.length} 个有效用例`, () => {
    expect(valid.length).toBeGreaterThan(0);
  });

  for (const c of valid) {
    const [y, mo, d, h, mi] = c.input;
    const name = `${y}-${mo}-${d} ${h}:${mi} ji=${c.ji} acum=${c.acum}`;

    it(name, () => {
      const e = new TaiyiEngine(y, mo, d, h, mi);

      // 历法层
      expect(e.gangzhi(), '干支').toEqual(c.gz);
      const lunar = e.lunar();
      expect([lunar.year, lunar.month, lunar.day], '农历').toEqual(c.lunar);
      expect(e.jieqi(), '节气').toBe(c.jq);

      // 积数与局式
      expect(e.accNum(c.ji, c.acum), '积数').toBe(c.acc);
      const kook = e.kook(c.ji, c.acum);
      expect(kook.text, '局式文').toBe(c.kook_text);
      expect(kook.num, '局数').toBe(c.kook_num);
      expect(kook.sanYear, '理天/地/人').toBe(c.kook_year);

      // 落位
      expect(e.taiyiGong(c.ji, c.acum), '太乙落宫').toBe(c.ty);
      expect(e.skyEyes(c.ji, c.acum), '文昌').toBe(c.wc);
      expect(e.skyEyesDesc(c.ji, c.acum) ?? '', '文昌处境').toBe(c.wc_des ?? '');
      expect(e.shiJi(c.ji, c.acum), '始击').toBe(c.sf);
      expect(e.dingMu(c.ji, c.acum), '定目').toBe(c.se);
      expect(e.jiGod(c.ji, c.acum), '计神').toBe(c.jigod);
      expect(e.heGod(c.ji), '合神').toBe(c.hegod);
      expect(e.taisui(c.ji), '太岁').toBe(c.taishui);

      // 主客定算三将
      expect(e.homeCal(c.ji, c.acum), '主算').toBe(c.home_cal);
      expect(e.homeGeneral(c.ji, c.acum), '主将').toBe(c.home_g);
      expect(e.homeVGen(c.ji, c.acum), '主参').toBe(c.home_v);
      expect(e.awayCal(c.ji, c.acum), '客算').toBe(c.away_cal);
      expect(e.awayGeneral(c.ji, c.acum), '客将').toBe(c.away_g);
      expect(e.awayVGen(c.ji, c.acum), '客参').toBe(c.away_v);
      expect(e.setCal(c.ji, c.acum), '定算').toBe(c.set_cal);
      expect(e.setGeneral(c.ji, c.acum), '定将').toBe(c.set_g);
      expect(e.setVGen(c.ji, c.acum), '定参').toBe(c.set_v);

      // 神煞
      expect(e.kingBase(c.ji, c.acum), '君基').toBe(c.kingbase);
      expect(e.officerBase(c.ji, c.acum), '臣基').toBe(c.officerbase);
      expect(e.pplBase(c.ji, c.acum), '民基').toBe(c.pplbase);
      expect(e.fourGod(c.ji, c.acum), '四神').toBe(c.fgd);
      expect(e.skyYi(c.ji, c.acum), '天乙').toBe(c.skyyi);
      expect(e.earthYi(c.ji, c.acum), '地乙').toBe(c.earthyi);
      expect(e.zhiFu(c.ji, c.acum), '直符').toBe(c.zhifu);
      expect(e.flyFu(c.ji, c.acum), '飞符').toBe(c.flyfu);
      expect(e.yearChin(), '太岁禽星').toBe(c.year_chin);
      expect(e.shiJiXiu(c.ji, c.acum), '始击值宿').toBe(c.sf_num);

      // 以积数起例的诸神
      const acc = c.acc!;
      expect(e.tianWang(acc) ?? null, '天皇').toBe(c.tian_wang ?? null);
      expect(e.tianShi(acc) ?? null, '天时').toBe(c.tian_shi ?? null);
      expect(e.wuxingGod(acc) ?? null, '五行').toBe(c.wuxing_god ?? null);
      expect(e.kingFu(acc) ?? null, '帝符').toBe(c.kingfu ?? null);
      expect(e.taiJun(acc) ?? null, '太尊').toBe(c.taijun ?? null);
      expect(e.wuFu(acc), '五福').toBe(c.wufu);
      expect(e.threeWind(acc) ?? null, '三风').toBe(c.threewind ?? null);
      expect(e.fiveWind(acc) ?? null, '五风').toBe(c.fivewind ?? null);
      expect(e.eightWind(acc) ?? null, '八风').toBe(c.eightwind ?? null);
      const flybird = typeof c.flybird === 'string' ? null : c.flybird ?? null;
      expect(e.flyBird(acc) ?? null, '飞鸟').toBe(flybird);
      expect(e.bigYo(acc) ?? null, '大游').toBe(c.bigyo ?? null);
      expect(e.smallYo(acc) ?? null, '小游').toBe(c.smyo ?? null);

      // 八门
      const doors = e.eightDoors(c.ji, c.acum);
      const doorsStr: Record<string, string> = {};
      for (const [k, v] of Object.entries(doors)) doorsStr[k] = v;
      expect(doorsStr, '八门').toEqual(c.doors);

      // 格局（比键集合；四郭杜为本项目依古法增补，参考实现无此格）
      let gejuKeys = Object.keys(e.geJu(c.ji, c.acum)).filter((k) => k !== '四郭杜');
      if (gejuKeys.length === 0) gejuKeys = ['無格局'];
      expect(gejuKeys.sort(), '格局').toEqual(c.geju);

      // 纪元 / 五子元 / 阳九百六 / 卦
      expect(e.jiYuan(c.ji, c.acum), '纪元').toBe(c.jiyuan);
      expect(e.fiveYuanKook(c.ji, c.acum), '五子元局').toBe(c.five_yuan);
      expect(e.yangJiu(), '阳九').toBe(c.yangjiu);
      expect(e.baiLiu(), '百六').toBe(c.baliu);
      expect(e.yearGua(c.acum), '值年卦').toBe(c.yeargua);
      expect(e.dayGua(c.acum), '值日卦').toBe(c.daygua);
      expect(e.hourGua(c.acum), '值时卦').toBe(c.hourgua);
    });
  }
});

describe.skipIf(mingfaCases.length === 0)('kintaiyi 命法黄金用例对照', () => {
  const valid = mingfaCases.filter((c) => !c.error);

  const guaEq = (actual: { num: number; gua: string | null }, expected: [number, string | null], label: string) => {
    expect(actual.num, `${label}数`).toBe(expected[0]);
    expect(actual.gua ?? null, `${label}卦`).toBe(expected[1] ?? null);
  };

  for (const c of valid) {
    const [y, mo, d, h, mi] = c.input;
    it(`${y}-${mo}-${d} ${h}:${mi} ${c.sex}`, () => {
      const asOf = c.as_of
        ? { year: c.as_of[0], month: c.as_of[1], day: c.as_of[2] }
        : undefined;
      const m = calculateMingfa(
        { year: y, month: mo, day: d, hour: h, minute: mi, jiStyle: 0, acumYear: 0 },
        c.sex,
        asOf,
      );
      expect(m.lifeAccum, '命法积数').toBe(c.life_accum);
      expect(m.threeCai, '三才数').toEqual(c.three_cai);
      expect(m.twelvePalaces, '十二命宫').toEqual(c.twelve_palaces);
      expect(m.yangjiuXingxian, '阳九行限').toEqual(c.yangjiu_xingxian);
      expect(m.bailiuXingxian, '百六行限').toEqual(c.bailiu_xingxian);
      expect(m.souqiNum, '受气数').toBe(c.souqi_num);
      expect(m.shouqiGanzhi, '受气干支').toBe(c.shouqi_ganzhi);
      guaEq(m.lifeStartGua, c.life_start_gua!, '出身');
      guaEq(m.yearGua, c.year_gua!, '值年');
      guaEq(m.monthGua, c.month_gua!, '值月');
      guaEq(m.dayGua, c.day_gua!, '值日');
      guaEq(m.hourGua, c.hour_gua!, '值时');
      guaEq(m.minuteGua, c.minute_gua!, '值分');
    });
  }
});
