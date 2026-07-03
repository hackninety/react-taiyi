import { useEffect, useMemo, useState } from 'react';
import { fetchDoc } from '../taiyi/pan';
import type { DocName } from '../taiyi/pan';
import {
  firstTable, numberedSections, splitByHeading, stripHtml, splitLinks, paragraphs,
} from '../lib/mdlite';
import { parseExamples } from '../lib/examples';

/**
 * kintaiyi 上游 docs/*.md 五个独立页：
 * 局數史例（交互年表→即时排盘）/ 災異統計 / 古籍書目 / 看盤要領 / 更新日誌。
 * 数据经后端 GET /api/docs/{name} 直读上游仓库，随上游更新。
 */

// —— 会话级缓存（后端有 Cache-Control，此处避免同会话重复请求） ——
const docCache = new Map<string, string>();

type DocState = { phase: 'loading' } | { phase: 'ok'; md: string } | { phase: 'err'; reason: string };

function useDoc(name: DocName, apiBase: string): DocState {
  const [state, setState] = useState<DocState>(() =>
    docCache.has(name) ? { phase: 'ok', md: docCache.get(name)! } : { phase: 'loading' });
  useEffect(() => {
    if (docCache.has(name)) { setState({ phase: 'ok', md: docCache.get(name)! }); return; }
    let active = true;
    const ctrl = new AbortController();
    setState({ phase: 'loading' });
    fetchDoc(name, apiBase, ctrl.signal)
      .then((md) => { docCache.set(name, md); if (active) setState({ phase: 'ok', md }); })
      .catch((e: unknown) => {
        if (active) setState({ phase: 'err', reason: e instanceof Error ? e.message : String(e) });
      });
    return () => { active = false; ctrl.abort(); };
  }, [name, apiBase]);
  return state;
}

function DocShell({ title, tag, state, children }: {
  title: string; tag: string; state: DocState;
  children: (md: string) => React.ReactNode;
}) {
  return (
    <section className="card doc-page">
      <h3>{title}<span className="pan-tag">{tag} · 上游直出 · 隨上游更新</span></h3>
      {state.phase === 'loading' && <p className="pan-note">內容載入中…</p>}
      {state.phase === 'err' && (
        <p className="pan-note err">載入失敗：{state.reason}（需 kintaiyi 后端可用）</p>
      )}
      {state.phase === 'ok' && children(state.md)}
    </section>
  );
}

const yearLabel = (y: number) => (y < 0 ? `前${-y}` : `${y}`);

/** 📜 局數史例：点年份看史例，可一键用该年起局 */
export function HistoryExamplesPage({ apiBase, onPickYear }: {
  apiBase: string; onPickYear: (year: number) => void;
}) {
  const state = useDoc('example', apiBase);
  const [sel, setSel] = useState(0);
  const rows = useMemo(
    () => (state.phase === 'ok' ? parseExamples(state.md) : []),
    [state],
  );
  const cur = rows[sel];
  return (
    <DocShell title="局數史例" tag="docs/example.md" state={state}>
      {() => (
        <>
          <p className="pan-note">
            点选年份查看史载局例；「用此年起局」切回排盘页即时推演该年盘——
            公元 600 年前（含公元前）自动走「皇极历法拟推口径」，其年计局数与年柱已同上游
            kintaiyi（sxtwl 古历，原生支持公元前）经本表 67 例逐行对照一致（tests/examples.test.ts 锁定）。
            注：个别史載局数为「某元第 N 局」的元内序号口径（如前 578 年「丙子元第八局」＝丙子起数至癸未第 8 位），
            与 1–72 连续局编号不同，属文本口径差异而非推算不合。
          </p>
          <div className="hx-year-strip" role="tablist" aria-label="史例年份">
            {rows.map((r, i) => (
              <button
                key={`${r.year}-${i}`}
                type="button"
                className={i === sel ? 'active' : ''}
                onClick={() => setSel(i)}
                title={`史載局數 ${r.kook}`}
              >
                {yearLabel(r.year)}
              </button>
            ))}
          </div>
          {cur && (
            <div className="hx-example">
              <div className="hx-example-head">
                <strong>{cur.year < 0 ? `公元前 ${-cur.year} 年` : `公元 ${cur.year} 年`}</strong>
                <span>史載局數：{cur.kook}</span>
                <span>出處：{cur.source}</span>
                <button
                  type="button"
                  className="btn-outline"
                  // 上游 -N 表公元前 N 年；输入框用天文纪年（0=前1年），故 BC 需 +1
                  onClick={() => onPickYear(cur.year < 0 ? cur.year + 1 : cur.year)}
                >
                  ⚙ 用此年起局
                </button>
              </div>
              <p className="pan-text">{cur.event}</p>
            </div>
          )}
        </>
      )}
    </DocShell>
  );
}

/** 🔥 災異統計：编号节 + 表格 + 各节案例计数 */
export function DisasterPage({ apiBase }: { apiBase: string }) {
  const state = useDoc('disaster', apiBase);
  return (
    <DocShell title="災異統計" tag="docs/disaster.md" state={state}>
      {(md) => {
        const secs = numberedSections(md).map((s) => {
          const table = firstTable(s.body);
          const intro = s.body.split(/\r?\n/).find((l) => l.trim() && !l.includes('|')) ?? '';
          return { ...s, table, intro: intro.trim() };
        });
        return (
          <>
            <div className="dz-stats">
              {secs.map((s) => (
                <span key={s.no} className="dz-chip">{s.title} <b>{s.table?.rows.length ?? 0}</b> 例</span>
              ))}
            </div>
            {secs.map((s) => (
              <details key={s.no} className="pan-group" open={s.no === 1}>
                <summary>{s.no}. {s.title}<em>{s.intro.slice(0, 40)}</em></summary>
                <div className="pan-body">
                  {s.intro && <p className="pan-note">{s.intro}</p>}
                  {s.table && (
                    <div className="gtable-wrap">
                      <table className="gtable">
                        <thead><tr>{s.table.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {s.table.rows.map((r, i) => (
                            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </>
        );
      }}
    </DocShell>
  );
}

/** 📚 古籍書目：按朝代分组 */
export function GujiPage({ apiBase }: { apiBase: string }) {
  const state = useDoc('guji', apiBase);
  return (
    <DocShell title="太乙古籍書目" tag="docs/guji.md" state={state}>
      {(md) => {
        const t = firstTable(md);
        const groups: Array<{ dynasty: string; items: string[][] }> = [];
        for (const r of t?.rows ?? []) {
          const d = r[0] || '（未注朝代）';
          const g = groups.find((x) => x.dynasty === d);
          if (g) g.items.push(r); else groups.push({ dynasty: d, items: [r] });
        }
        return groups.map((g) => (
          <details key={g.dynasty} className="pan-group" open>
            <summary>{g.dynasty}<em>{g.items.length} 部</em></summary>
            <div className="pan-body">
              <table className="pan-kv">
                <tbody>
                  {g.items.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{r[2] || '—'}</th>
                      <td>
                        {r[1] && <span className="pan-scalar">{r[1]} 撰</span>}
                        {r[3] && (
                          <p className="pan-text">
                            {splitLinks(r[3]).map((p, j) => p.href
                              ? <a key={j} href={p.href} target="_blank" rel="noreferrer">{p.text}</a>
                              : <span key={j}>{p.text}</span>)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ));
      }}
    </DocShell>
  );
}

/** 🚀 看盤要領：instruction 步骤 + tutorial 诸篇 */
export function TutorialPage({ apiBase }: { apiBase: string }) {
  const ins = useDoc('instruction', apiBase);
  const tut = useDoc('tutorial', apiBase);
  return (
    <>
      <DocShell title="使用步驟" tag="docs/instruction.md" state={ins}>
        {(md) => (
          <ol className="gsteps">
            {md.split(/\r?\n/)
              .map((l) => /^\s*\d+\s*[.、]\s*(.+)$/.exec(l)?.[1])
              .filter((x): x is string => Boolean(x))
              .map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        )}
      </DocShell>
      <DocShell title="看盤要領" tag="docs/tutorial.md" state={tut}>
        {(md) => (
          <div className="pan-groups tut-groups">
            {splitByHeading(stripHtml(md), '##').map((s) => (
              <details key={s.title} className="pan-group">
                <summary>{s.title}</summary>
                <div className="pan-body">
                  {paragraphs(s.body).map((p, i) => <p key={i} className="pan-text">{p}</p>)}
                </div>
              </details>
            ))}
          </div>
        )}
      </DocShell>
    </>
  );
}

/** 🆕 更新日誌（上游 kintaiyi） */
export function UpdatesPage({ apiBase }: { apiBase: string }) {
  const state = useDoc('update', apiBase);
  return (
    <DocShell title="上游更新日誌" tag="docs/update.md" state={state}>
      {(md) => (
        <ul className="upd-list">
          {splitByHeading(md, '###').map((s) => (
            <li key={s.title}>
              <strong>{s.title.replace(/[【】]/g, '')}</strong>
              <div>
                {s.body.split(/\r?\n/)
                  .map((l) => /^\s*[-*]\s+(.+)$/.exec(l)?.[1])
                  .filter((x): x is string => Boolean(x))
                  .map((item, i) => <p key={i} className="pan-text">· {item}</p>)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </DocShell>
  );
}

// 供 App 一站式渲染
export function DocsView({ view, apiBase, onPickYear }: {
  view: 'history' | 'disaster' | 'books' | 'tutorial' | 'updates';
  apiBase: string;
  onPickYear: (year: number) => void;
}) {
  if (view === 'history') return <HistoryExamplesPage apiBase={apiBase} onPickYear={onPickYear} />;
  if (view === 'disaster') return <DisasterPage apiBase={apiBase} />;
  if (view === 'books') return <GujiPage apiBase={apiBase} />;
  if (view === 'tutorial') return <TutorialPage apiBase={apiBase} />;
  return <UpdatesPage apiBase={apiBase} />;
}
