import type { MingfaResult } from '../taiyi';

interface Props {
  mingfa: MingfaResult;
}

const ZHI_ORDER = [...'子丑寅卯辰巳午未申酉戌亥'];

export function MingfaPanel({ mingfa: m }: Props) {
  return (
    <section className="card">
      <h3>太乙命法</h3>
      <div className="row">
        <span className="row-label">命法积数</span>
        <span className="row-value">{m.lifeAccum.toLocaleString('en-US')}</span>
      </div>
      <div className="row">
        <span className="row-label">三才数</span>
        <span className="row-value">天 {m.threeCai[0]} · 地 {m.threeCai[1]} · 人 {m.threeCai[2]}</span>
      </div>
      <div className="row">
        <span className="row-label">受气</span>
        <span className="row-value">受气数 {m.souqiNum} · 受气干支 {m.shouqiGanzhi}</span>
      </div>
      <div className="row">
        <span className="row-label">出身卦</span>
        <span className="row-value">{m.lifeStartGua.gua ?? '—'}（{m.lifeStartGua.num}）</span>
      </div>
      <div className="row">
        <span className="row-label">流年卦链</span>
        <span className="row-value">
          年 {m.yearGua.gua ?? '—'} · 月 {m.monthGua.gua ?? '—'} · 日 {m.dayGua.gua ?? '—'} · 时 {m.hourGua.gua ?? '—'} · 分 {m.minuteGua.gua ?? '—'}
        </span>
      </div>

      <h4>十二命宫（{m.sex}命）</h4>
      <div className="palace-grid">
        {ZHI_ORDER.map((zhi) => (
          <div key={zhi} className={`palace ${m.twelvePalaces[zhi] === '命宮' ? 'palace-ming' : ''}`}>
            <span className="palace-zhi">{zhi}</span>
            <span className="palace-name">{m.twelvePalaces[zhi] ?? ''}</span>
          </div>
        ))}
      </div>

      <h4>阳九行限</h4>
      <div className="xingxian">
        {m.yangjiuXingxian.map(([range, zhi]) => (
          <div key={`yj-${range}`} className="xingxian-cell">
            <span className="xx-range">{range}</span>
            <span className="xx-zhi">{zhi}</span>
          </div>
        ))}
      </div>

      <h4>百六行限</h4>
      <div className="xingxian">
        {m.bailiuXingxian.map(([range, zhi]) => (
          <div key={`bl-${range}`} className="xingxian-cell">
            <span className="xx-range">{range}</span>
            <span className="xx-zhi">{zhi}</span>
          </div>
        ))}
      </div>

      <p className="mingfa-note">
        行限自一岁起，每段十年；阳九以生月干起限，百六以受气干支起限，男顺女逆。
      </p>
    </section>
  );
}
