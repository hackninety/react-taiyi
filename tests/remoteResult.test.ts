/**
 * 上游古歷盘装配器守卫：buildRemoteResult(chart, pan) 与本地引擎同参结果逐字段一致。
 * chart 取 golden.json（kintaiyi 输出，与 /api/taiyi 同构）、pan 取 pan_sample.json
 * （/api/taiyi/pan 实测样本，同一时刻 2026-07-03 14:30 时计×统宗）——
 * 两侧应装配出与 calculateTaiyi(standard) 数值层完全一致的盘（600 前即以此口径出盘）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { calculateTaiyi, buildRemoteResult } from '../src/taiyi';
import type { GongName, TaiyiInput } from '../src/taiyi';

const load = (f: string) => JSON.parse(readFileSync(join(__dirname, 'fixtures', f), 'utf-8'));

const golden = load('golden.json') as { cases: Array<Record<string, unknown>> };
const pan = load('pan_sample.json') as Record<string, unknown>;

const input: TaiyiInput = { year: 2026, month: 7, day: 3, hour: 14, minute: 30, jiStyle: 3, acumYear: 0 };
const chart = golden.cases.find((c) =>
  JSON.stringify(c.input) === JSON.stringify([2026, 7, 3, 14, 30]) && c.ji === 3 && c.acum === 0)!;

describe('上游古歷盘装配（buildRemoteResult）', () => {
  const remote = buildRemoteResult(input, chart, pan);
  const local = calculateTaiyi(input, 'standard');

  it('数值与断辞字段与本地引擎一致', () => {
    expect(remote.calendarMode).toBe('上游古歷');
    expect(remote.ganzhi).toEqual(local.ganzhi);
    expect([remote.lunar.year, remote.lunar.month, remote.lunar.day])
      .toEqual([local.lunar.year, local.lunar.month, local.lunar.day]);
    expect(remote.jieqi).toBe(local.jieqi);
    expect(remote.jiyuan).toBe(local.jiyuan);
    expect(remote.taisui).toBe(local.taisui);
    expect(remote.kook).toEqual(local.kook);
    expect(remote.fiveYuanKook).toBe(local.fiveYuanKook);
    expect(remote.yangjiu).toBe(local.yangjiu);
    expect(remote.bailiu).toBe(local.bailiu);
    expect(remote.taiyiGong).toBe(local.taiyiGong);
    expect(remote.taiyiGongName).toBe(local.taiyiGongName);
    expect(remote.homeAwayHint).toBe(local.homeAwayHint);
    expect(remote.skyEyes).toBe(local.skyEyes);
    expect(remote.skyEyesDesc).toBe(local.skyEyesDesc);
    expect(remote.shiJi).toBe(local.shiJi);
    expect(remote.shiJiXiu).toBe(local.shiJiXiu);
    expect(remote.dingMu).toBe(local.dingMu);
    expect(remote.heGod).toBe(local.heGod);
    expect(remote.jiGod).toBe(local.jiGod);
    expect(remote.homeSuan.value).toBe(local.homeSuan.value);
    expect(remote.awaySuan.value).toBe(local.awaySuan.value);
    expect(remote.setSuan.value).toBe(local.setSuan.value);
    // 算数阴阳解与本地同源（kintaiyi cal_des）——集合一致
    expect([...remote.homeSuan.descriptions].sort()).toEqual([...local.homeSuan.descriptions].sort());
    expect(remote.homeGeneral).toBe(local.homeGeneral);
    expect(remote.homeVGen).toBe(local.homeVGen);
    expect(remote.awayGeneral).toBe(local.awayGeneral);
    expect(remote.awayVGen).toBe(local.awayVGen);
    expect(remote.setGeneral).toBe(local.setGeneral);
    expect(remote.setVGen).toBe(local.setVGen);
    expect(remote.kingBase).toBe(local.kingBase);
    expect(remote.officerBase).toBe(local.officerBase);
    expect(remote.pplBase).toBe(local.pplBase);
    expect(remote.fourGod).toBe(local.fourGod);
    expect(remote.skyYi).toBe(local.skyYi);
    expect(remote.earthYi).toBe(local.earthYi);
    expect(remote.zhiFu).toBe(local.zhiFu);
    expect(remote.flyFu).toBe(local.flyFu);
    expect(remote.yearChin).toBe(local.yearChin);
    expect(remote.doors).toEqual(local.doors);
    expect(remote.yearGua).toBe(local.yearGua);
    expect(remote.dayGua).toBe(local.dayGua);
    expect(remote.hourGua).toBe(local.hourGua);
    expect(remote.wangZhuai).toEqual(local.wangZhuai);
  });

  it('格局：键集合与本地一致（本地增补的四郭杜除外），释文取上游全文', () => {
    const localKeys = Object.keys(local.geJu).filter((k) => k !== '四郭杜').sort();
    expect(Object.keys(remote.geJu).sort()).toEqual(localKeys);
    for (const v of Object.values(remote.geJu)) expect(String(v).length).toBeGreaterThan(0);
  });

  it('十六神盘：各宫星将集合与本地一致', () => {
    const gongs = Object.keys(local.board) as GongName[];
    expect(Object.keys(remote.board).sort()).toEqual([...gongs].sort());
    for (const g of gongs) {
      expect([...(remote.board[g] ?? [])].sort(), `宫 ${g}`)
        .toEqual([...local.board[g]].sort());
    }
  });
});
