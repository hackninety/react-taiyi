import type { HuangjiInfo } from '../taiyi';

interface Props {
  info: HuangjiInfo;
}

function Hex({ h }: { h: { name: string; symbol: string } }) {
  return <span className="hj-hex">{h.name}<em>{h.symbol}</em></span>;
}

export function HuangjiPanel({ info: h }: Props) {
  return (
    <section className="card">
      <h3>
        皇极经世历
        <span className={`school-badge ${h.school === '祝泌' ? 'warn' : 'ok'}`}>
          {h.school}派 · {h.school === '黄畿' ? '已校订原文' : '未校订·仅供参考'}
        </span>
      </h3>
      {h.school === '祝泌' && (
        <p className="school-warn">
          ⚠ 祝泌派岁卦暂未对照《皇极经世书解》原文，仅经第三方数据交叉验证，结果仅供参考；默认建议用黄畿派。
        </p>
      )}
      <div className="row">
        <span className="row-label">皇极纪年</span>
        <span className="row-value">
          第 {h.huangjiYear.toLocaleString('en-US')} 年
          <em>（一元 129,600 年，元起于公元前 67017 年）</em>
        </span>
      </div>
      <div className="row">
        <span className="row-label">会</span>
        <span className="row-value">
          {h.hui.branch}会（第 {h.hui.ordinal} 会）· 辟卦 <Hex h={h.hui.hexagram} /> · 会内第 {h.hui.yearInHui.toLocaleString('en-US')} 年
        </span>
      </div>
      <div className="row">
        <span className="row-label">运</span>
        <span className="row-value">
          元内第 {h.yun.global} 运 · 运卦 <Hex h={h.yun.hexagram} />
          <em>（主卦{h.yun.master.name}变{h.yun.yaoName}爻）</em> · 运内第 {h.yun.yearInYun} 年
        </span>
      </div>
      <div className="row">
        <span className="row-label">世</span>
        <span className="row-value">
          元内第 {h.shi.global.toLocaleString('en-US')} 世 · 世卦 <Hex h={h.shi.hexagram} /> · 世内第 {h.shi.yearInShi} 年
        </span>
      </div>
      <div className="row">
        <span className="row-label">十年卦</span>
        <span className="row-value">
          <Hex h={h.decade.hexagram} /><em>（世卦变{h.decade.yaoName}爻，黄畿注口径）</em>
        </span>
      </div>
      <div className="row">
        <span className="row-label">岁卦（{h.school}）</span>
        <span className="row-value">
          <Hex h={h.sui} />
          <em>（{h.suiOther.school}派作 {h.suiOther.hexagram.name}{h.suiOther.hexagram.symbol}）</em>
        </span>
      </div>
      <div className="row">
        <span className="row-label">月 / 日 / 时卦</span>
        <span className="row-value">
          <Hex h={h.month} /> / <Hex h={h.day} /> / <Hex h={h.hour} />
        </span>
      </div>
      <p className="mingfa-note">
        皇极经世为邵雍以易数纪史之历：元统十二会、会统三十运、运统十二世、世统三十年。
        运卦世卦两派同法；岁卦黄畿用「运卦变经卦、挨六十卦次」（已对照原文校验，默认），
        祝泌《观物篇解》用「先天六十卦序平推」（未对照原文，仅供参考），可在上方切换。
        月卦日卦依「日甲月子，合乎为复」以本盘月柱日柱起，时卦取十二消息卦。
        算法直接引用开源库 yhys-core（github:hackninety/react-yhys），随上游更新。
      </p>
    </section>
  );
}
