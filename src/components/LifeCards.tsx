import { useEffect, useState } from 'react';
import { fetchLife } from '../taiyi/pan';
import type { PanData } from '../taiyi/pan';
import type { Sex, TaiyiInput } from '../taiyi';
import { PanValue } from './PanCards';

/**
 * 命法卷二十扩展卡（kintaiyi taiyi_life() 直出，经 /api/taiyi/life）：
 * 本地命法面板（积数/三才/十二宫/行限/卦链，黄金用例锁定）之外的上游增补——
 * 安命安身宫、飛祿飛馬黑符、十提金賦、十二宮星斷、雙星同宮論、諸星三等与卷二十全篇。
 */

const GROUPS: Array<{ title: string; keys: string[] }> = [
  { title: '安宮與飛星', keys: ['安命宮', '安身宮', '飛祿', '飛馬', '黑符', '天盤'] },
  { title: '十提金賦', keys: ['十提金賦'] },
  { title: '十二宮星斷', keys: ['十二宮星斷'] },
  { title: '雙星同宮論', keys: ['雙星同宮論'] },
  { title: '諸星上中下三等', keys: ['諸星上中下三等'] },
  { title: '卷二十', keys: ['卷二十'] },
];

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ok'; life: PanData }
  | { phase: 'err'; reason: string };

export function LifeCards({ input, sex, apiBase, enabled }: {
  input: TaiyiInput; sex: Sex; apiBase: string; enabled: boolean;
}) {
  const [state, setState] = useState<State>({ phase: 'idle' });

  useEffect(() => {
    if (!enabled) { setState({ phase: 'idle' }); return; }
    let active = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    setState({ phase: 'loading' });
    fetchLife(input, sex, apiBase, ctrl.signal)
      .then((resp) => { if (active) setState({ phase: 'ok', life: resp.life }); })
      .catch((e: unknown) => {
        if (!active) return;
        setState({
          phase: 'err',
          reason: ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); ctrl.abort(); };
  }, [enabled, input, sex, apiBase]);

  if (!enabled) return null;
  return (
    <section className="card pan-wrap">
      <h3>
        命法卷二十（kintaiyi 直出）
        <span className="pan-tag">十提金賦 · 十二宮星斷 · 雙星同宮 · 諸星三等 · 隨上游更新</span>
      </h3>
      {state.phase === 'loading' && <p className="pan-note">命法扩展载入中…</p>}
      {state.phase === 'err' && <p className="pan-note err">载入失败：{state.reason}（本地命法面板不受影响）</p>}
      {state.phase === 'ok' && (
        <div className="pan-groups">
          {GROUPS.map((g) => {
            const present = g.keys.filter((k) => {
              const v = state.life[k];
              return v !== null && v !== undefined && v !== ''
                && !(typeof v === 'object' && Object.keys(v as object).length === 0);
            });
            if (present.length === 0) return null;
            return (
              <details key={g.title} className="pan-group">
                <summary>{g.title}</summary>
                <div className="pan-body">
                  {present.map((k) => (
                    <div key={k} className="pan-item">
                      {present.length > 1 && <h4>{k}</h4>}
                      <PanValue v={state.life[k]} />
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
