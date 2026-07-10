import type { PanData } from '../taiyi/pan';
import { GroupModalCards, PanValue } from './PanCards';
import type { ModalGroup } from './PanCards';

/**
 * 命法卷二十扩展卡（kintaiyi taiyi_life() 直出，经 /api/taiyi/life）：
 * 本地命法面板（积数/三才/十二宫/行限/卦链，黄金用例锁定）之外的上游增补——
 * 安命安身宫、飛祿飛馬黑符、十提金賦、十二宮星斷、雙星同宮論、諸星三等与卷二十全篇。
 * 数据由 App 统一请求（并同时并入 AI 导出 kintaiyiLife 字段），本组件仅渲染（与全解釋卡同款模态框）。
 */

const GROUPS: Array<{ title: string; note?: string; keys: string[] }> = [
  { title: '安宮與飛星', note: '安命安身宮 · 飛祿飛馬黑符 · 天盤', keys: ['安命宮', '安身宮', '飛祿', '飛馬', '黑符', '天盤'] },
  { title: '十提金賦', note: '卷二十：命身十二宮所臨之星匹配賦文', keys: ['十提金賦'] },
  { title: '十二宮星斷', note: '卷二十：諸星臨十二宮斷語全文', keys: ['十二宮星斷'] },
  { title: '雙星同宮論', note: '卷二十：兩星同宮之論', keys: ['雙星同宮論'] },
  { title: '諸星上中下三等', note: '卷二十：諸星旺陷三等', keys: ['諸星上中下三等'] },
  { title: '卷二十', note: '卷二十全篇其余諸節', keys: ['卷二十'] },
];

function hasContent(v: unknown): boolean {
  return v !== null && v !== undefined && v !== ''
    && !(typeof v === 'object' && Object.keys(v as object).length === 0);
}

export type LifeState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ok'; life: PanData }
  | { phase: 'err'; reason: string };

export function LifeCards({ state }: { state: LifeState }) {
  if (state.phase === 'idle') return null;

  const life: PanData | null = state.phase === 'ok' ? state.life : null;
  const groups: ModalGroup[] = life
    ? GROUPS
      .map((g) => ({ g, present: g.keys.filter((k) => hasContent(life[k])) }))
      .filter((x) => x.present.length > 0)
      .map(({ g, present }) => ({
        title: g.title,
        note: g.note,
        content: (
          <>
            {present.map((k) => (
              <div key={k} className="pan-item">
                {(present.length > 1 || k !== g.title) && <h4>{k}</h4>}
                <PanValue v={life[k]} />
              </div>
            ))}
          </>
        ),
      }))
    : [];

  return (
    <section className="card pan-wrap">
      <h3>
        命法卷二十（kintaiyi 直出）
        <span className="pan-tag">十提金賦 · 十二宮星斷 · 雙星同宮 · 諸星三等 · 隨上游更新 · 已并入 AI 導出</span>
      </h3>
      {state.phase === 'loading' && <p className="pan-note">命法扩展载入中…</p>}
      {state.phase === 'err' && <p className="pan-note err">载入失败：{state.reason}（本地命法面板不受影响）</p>}
      {life && <GroupModalCards groups={groups} resetKey={life} />}
    </section>
  );
}
