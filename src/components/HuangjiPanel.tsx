import type { HuangjiInfo } from '../taiyi';
import { formatGregorianYearCn } from '../taiyi';

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
        <span className="school-badge ok">黄畿派 · 已校订原文</span>
      </h3>
      <div className="row">
        <span className="row-label">皇极纪年</span>
        <span className="row-value">
          第 {h.huangjiYear.toLocaleString('en-US')} 年，对应{formatGregorianYearCn(h.huangjiYear - 67017)}
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
        <span className="row-label">岁卦（黄畿）</span>
        <span className="row-value">
          <Hex h={h.sui} />
        </span>
      </div>
      <div className="row">
        <span className="row-label">月经 / 旬纬 / 日 / 时经卦</span>
        <span className="row-value">
          <Hex h={h.yueJing} /> / <Hex h={h.xunWei} /> / <Hex h={h.day} /> / <Hex h={h.shiJing} />
          <em>（皇极岁内第 {h.dayOfYear} 日；{h.subYearNote}）</em>
        </span>
      </div>
      <p className="mingfa-note">
        皇极经世为邵雍以易数纪史之历：元统十二会、会统三十运、运统十二世、世统三十年，
        一元全跨度公元前 67016 — 公元 62583 均可推算（勾选「皇极」后年份输入即解锁全跨度；
        公元 600–9999 外的太乙盘自动切换为「皇极历法拟推口径」，见局式卡标注）。
        岁卦用黄畿「运卦变经卦、挨六十卦次」（已对照《皇极经世书》黄畿注原文校验，84 个文献锚点）；
        祝泌《观物篇解》一派暂未对照原文，已关闭不用。
        岁以下月/日/时卦取黄畿「岁卦逐层变爻·挨卦」纯正推法：岁卦→月经卦（变爻，60日/双月）
        →旬纬卦（10日/旬）→日卦（月经卦位置起挨六十卦次）→时经卦（日卦变爻，2时辰/卦，自子半起），
        皇极以冬至换岁定位年内天数（1–360）。
        算法直接引用开源库 yhys-core（github:hackninety/react-yhys），随上游更新。
      </p>
    </section>
  );
}
