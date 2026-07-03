import type { ReactNode } from 'react';
import type { SolarTimeInfo, TaiyiResult } from '../taiyi';
import { NUM_TO_GONG } from '../taiyi';

interface Props {
  result: TaiyiResult;
  solarInfo?: SolarTimeInfo;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className="row-value">{children}</span>
    </div>
  );
}

const gongText = (n: number) => `${'一二三四五六七八九'[n - 1]}宮（${NUM_TO_GONG[n]}）`;

export function ResultPanel({ result, solarInfo }: Props) {
  const r = result;
  return (
    <>
      <section className="card">
        <h3>局式</h3>
        <Row label="太乙计">{r.jiName} · {r.methodName}</Row>
        {r.calendarMode === '皇极拟推' && (
          <Row label="历法口径">
            <span className="cal-warn">皇极拟推（四柱纯算术＋天文节气，农历为节气月建拟推，非古历考据）</span>
          </Row>
        )}
        {solarInfo?.applied && (
          <Row label="真太阳时">
            {solarInfo.timezone ? `浏览器时区 ${solarInfo.timezone} · ` : ''}
            {solarInfo.place}（经度 {solarInfo.longitude}°）校正 {solarInfo.offsetMinutes! >= 0 ? '+' : ''}{solarInfo.offsetMinutes} 分钟
          </Row>
        )}
        <Row label="四柱">
          {r.ganzhi[0]}年 {r.ganzhi[1]}月 {r.ganzhi[2]}日 {r.ganzhi[3]}时
          {r.input.jiStyle === 4 ? ` ${r.ganzhi[4]}分` : ''}
        </Row>
        <Row label="农历">{r.lunar.text}</Row>
        <Row label="节气">{r.jieqi}</Row>
        <Row label="纪元">{r.jiyuan}</Row>
        <Row label="积数">{r.kook.accNum.toLocaleString('en-US')}</Row>
        <Row label="局式">{r.kook.text} · {r.kook.sanYear}</Row>
        {r.fiveYuanKook && <Row label="五子元局">{r.fiveYuanKook}</Row>}
        <Row label="太岁">{r.taisui}</Row>
        <Row label="阳九 / 百六">{r.yangjiu} / {r.bailiu}</Row>
      </section>

      <section className="card">
        <h3>主客定</h3>
        <Row label="太乙">{gongText(r.taiyiGong)}{r.homeAwayHint ? ` · ${r.homeAwayHint}` : ''}</Row>
        <Row label="文昌（天目）">{r.skyEyes}{r.skyEyesDesc ? `（${r.skyEyesDesc}）` : ''}</Row>
        <Row label="始击（客目）">{r.shiJi} · 值宿 {r.shiJiXiu}</Row>
        <Row label="定目">{r.dingMu}</Row>
        <Row label="计神 / 合神">{r.jiGod} / {r.heGod}</Row>
        <Row label="主算">
          {r.homeSuan.value} <em>{r.homeSuan.descriptions.join('、')}</em>
        </Row>
        <Row label="主将 / 主参">{gongText(r.homeGeneral)} / {gongText(r.homeVGen)}</Row>
        <Row label="客算">
          {r.awaySuan.value} <em>{r.awaySuan.descriptions.join('、')}</em>
        </Row>
        <Row label="客将 / 客参">{gongText(r.awayGeneral)} / {gongText(r.awayVGen)}</Row>
        <Row label="定算">
          {r.setSuan.value} <em>{r.setSuan.descriptions.join('、')}</em>
        </Row>
        <Row label="定将 / 定参">{gongText(r.setGeneral)} / {gongText(r.setVGen)}</Row>
      </section>

      <section className="card">
        <h3>格局</h3>
        <ul className="geju-list">
          {Object.entries(r.geJu).map(([name, desc]) => (
            <li key={name}>
              <strong>{name}</strong>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
        <Row label="三门">{r.threeDoors}</Row>
        <Row label="五将">{r.fiveGenerals}</Row>
        {r.homeAwayRelation && <Row label="主客相关">{r.homeAwayRelation}</Row>}
        {r.guDan && <Row label="孤单">{r.guDan}</Row>}
      </section>

      <section className="card">
        <h3>神煞 · 门 · 卦</h3>
        <Row label="值事门">{r.zhishiDoor}门</Row>
        <Row label="君基 / 臣基 / 民基">{r.kingBase} / {r.officerBase} / {r.pplBase}</Row>
        <Row label="四神 / 天乙 / 地乙">{r.fourGod} / {r.skyYi} / {r.earthYi}</Row>
        <Row label="直符 / 飞符">{r.zhiFu} / {r.flyFu}</Row>
        <Row label="太岁禽星">{r.yearChin} · 廿八宿起 {r.startXiu}</Row>
        <Row label="值年卦">{r.yearGua}</Row>
        <Row label="值日卦">{r.dayGua}</Row>
        <Row label="值时卦">{r.hourGua}</Row>
      </section>
    </>
  );
}
