import { useState } from 'react';
import { fetchPan } from '../taiyi/pan';
import type { TaiyiInput } from '../taiyi';

/**
 * kintaiyi 全解釋分组卡的增强插件（parity P1/P2）：
 * - TongyunExtra：統運入卦六爻年段时间轴 + 觀象期十二月直事轴 + 流年直卦摘要 + 任意年統運查詢
 * - GuiyunExtra：大小遊軌運內外卦年段轴
 * - WuzhenExtra：五陣置旗 + 八陣 + 陳兵出鄉 SVG 示意图
 * 数据全部取自上游 pan() 字段，不重推任何算法。
 */

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const dict = (v: unknown): Record<string, unknown> =>
  (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

// —— 通用年段时间轴 ——
interface Seg { label: string; span: number; active?: boolean; tip?: string }

function TimelineBar({ segments, progress, caption }: {
  segments: Seg[]; progress?: number; caption?: string;
}) {
  return (
    <div className="tl-wrap">
      {caption && <div className="tl-caption">{caption}</div>}
      <div className="tl-bar">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`tl-seg ${s.active ? 'active' : ''}`}
            style={{ flexGrow: s.span }}
            title={s.tip ?? s.label}
          >
            <span>{s.label}</span>
          </div>
        ))}
        {progress !== undefined && (
          <div className="tl-pin" style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        )}
      </div>
    </div>
  );
}

const YAO_HINT = ['建功', '安平', '內極', '待治', '君弱', '外極'];

/** 統運（卷十二）增强 */
export function TongyunExtra({ vol12, input, apiBase }: {
  vol12: Record<string, unknown>; input: TaiyiInput; apiBase: string;
}) {
  const ru = dict(vol12['統運入卦']);
  const ln = dict(vol12['流年直卦']);
  const gx = dict(vol12['觀象期']);
  const months = Array.isArray(gx['十二月直事']) ? gx['十二月直事'] as Array<Record<string, unknown>> : [];

  const yearNow = num(ru['公元年']);
  const inGua = num(ru['入卦年數']);      // 1-360
  const curYao = num(ru['爻']);           // 1-6
  const guaStartYear = yearNow - inGua + 1;

  // 統運查詢（任意年）：复用 pan 端点（服务端 LRU），取该年統運入卦与流年直卦
  const [qYear, setQYear] = useState<string>(String(yearNow));
  const [q, setQ] = useState<
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'ok'; year: number; ru: Record<string, unknown>; ln: Record<string, unknown> }
    | { phase: 'err'; reason: string }
  >({ phase: 'idle' });

  const runQuery = () => {
    const y = Number(qYear);
    if (!Number.isFinite(y) || y < 600 || y > 9999) {
      setQ({ phase: 'err', reason: '查询年须在 600–9999（kintaiyi 历法范围）' });
      return;
    }
    setQ({ phase: 'loading' });
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    fetchPan({ ...input, year: y }, apiBase, false, ctrl.signal)
      .then((resp) => {
        const v12 = dict(resp.pan['卷十二']);
        setQ({ phase: 'ok', year: y, ru: dict(v12['統運入卦']), ln: dict(v12['流年直卦']) });
      })
      .catch((e: unknown) => setQ({
        phase: 'err',
        reason: ctrl.signal.aborted ? '请求超时' : e instanceof Error ? e.message : String(e),
      }))
      .finally(() => clearTimeout(t));
  };

  return (
    <div className="pan-extra">
      <TimelineBar
        caption={`統運卦「${str(ru['卦'])}」六爻年段（一運 360 年，每爻 60 年；今入卦第 ${inGua} 年 · ${str(ru['爻名'])} 第 ${num(ru['入爻年數'])} 年）`}
        segments={Array.from({ length: 6 }, (_, i) => ({
          label: `${['初', '二', '三', '四', '五', '上'][i]}爻·${YAO_HINT[i]} ${guaStartYear + i * 60}–${guaStartYear + i * 60 + 59}`,
          span: 60,
          active: i + 1 === curYao,
        }))}
        progress={inGua / 360}
      />
      {months.length > 0 && (
        <TimelineBar
          caption={`觀象期十二月直事（本卦 ${str(gx['本卦'])} 起 ${str(gx['起爻'])}，變卦 ${str(gx['變卦'])}）`}
          segments={months.map((m) => ({
            label: `${str(m['月建'])}·${str(m['卦'])}${str(m['爻名'])}`,
            span: 1,
            tip: `第 ${num(m['月序'])} 月（${str(m['階段'])}）`,
          }))}
        />
      )}
      <p className="pan-text">
        流年直卦：{str(ln['年'])} 年（{str(ln['干支'])}）直卦 <strong>{str(ln['直卦'])}</strong>
        · {str(ln['爻名'])} · {str(ln['命爻法'])}；{str(ln['要訣'])}
      </p>
      <div className="tq-row">
        <label>
          統運查詢年
          <input
            type="number"
            value={qYear}
            min={600}
            max={9999}
            onChange={(ev) => setQYear(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === 'Enter') runQuery(); }}
          />
        </label>
        <button type="button" className="btn-outline" onClick={runQuery}>查詢</button>
        {q.phase === 'loading' && <span className="pan-note">查询中…</span>}
        {q.phase === 'err' && <span className="pan-note err">{q.reason}</span>}
      </div>
      {q.phase === 'ok' && (
        <p className="pan-text tq-result">
          {q.year} 年：{str(q.ru['運'])} · 統運卦 <strong>{str(q.ru['卦'])}</strong>
          · {str(q.ru['爻名'])}（入卦第 {num(q.ru['入卦年數'])} 年）——{str(q.ru['斷語'])}；
          流年直卦 {str(q.ln['直卦'])}（{str(q.ln['爻名'])}）
        </p>
      )}
    </div>
  );
}

/** 軌運（卷九）增强：大小遊內外卦年段轴 */
export function GuiyunExtra({ vol9 }: { vol9: Record<string, unknown> }) {
  const big = dict(vol9['大遊軌運']);
  const small = dict(vol9['小遊軌運']);
  const bar = (g: Record<string, unknown>, name: string) => {
    const inY = num(g['入內年數']);
    const outY = num(g['入外年數']);
    return (
      <TimelineBar
        key={name}
        caption={`${name}「${str(g['重卦'])}」（內卦${str(g['內卦'])} ${inY} 年 → 外卦${str(g['外卦'])} ${outY} 年；內策 ${num(g['內策'])} · 外策 ${num(g['外策'])} · 總策 ${num(g['總策'])}）`}
        segments={[
          { label: `內·${str(g['內卦'])}（${inY}年）`, span: Math.max(inY, 1), active: true },
          { label: `外·${str(g['外卦'])}（${outY}年）`, span: Math.max(outY, 1) },
        ]}
      />
    );
  };
  return (
    <div className="pan-extra">
      {bar(big, '大遊軌運')}
      {bar(small, '小遊軌運')}
    </div>
  );
}

// —— 五陣八陣（P2）——
const FLAG_COLOR: Record<string, string> = {
  白旗: '#e8e0cc', 赤旗: '#dc4848', 青旗: '#5aa87a', 黑旗: '#4a5568', 黃旗: '#d4af37',
};
const DIR_ANGLE: Record<string, number> = {
  北方: -90, 東北: -45, 東方: 0, 東南: 45, 南方: 90, 西南: 135, 西方: 180, 西北: -135,
  正北: -90, 正東: 0, 正南: 90, 正西: 180,
};

function FormationShape({ kind, color, x, y }: { kind: string; color: string; x: number; y: number }) {
  const s = 26;
  if (kind.includes('方')) return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill="none" stroke={color} strokeWidth="2.5" />;
  if (kind.includes('銳')) return <path d={`M ${x} ${y - s / 2} L ${x + s / 2} ${y + s / 2} L ${x - s / 2} ${y + s / 2} Z`} fill="none" stroke={color} strokeWidth="2.5" />;
  if (kind.includes('圓')) return <circle cx={x} cy={y} r={s / 2} fill="none" stroke={color} strokeWidth="2.5" />;
  if (kind.includes('曲')) return <path d={`M ${x - s / 2} ${y + 6} q 7 -18 ${s / 2} 0 q 7 18 ${s / 2} -12`} fill="none" stroke={color} strokeWidth="2.5" />;
  return <line x1={x} y1={y - s / 2} x2={x} y2={y + s / 2} stroke={color} strokeWidth="2.5" />; // 直陣
}

export function WuzhenExtra({ junshi }: { junshi: Record<string, unknown> }) {
  const wz = dict(junshi['五陣置旗']);
  const home = dict(wz['主陣旗']);
  const away = dict(wz['客陣旗']);
  const eight = Array.isArray(wz['八陣']) ? (wz['八陣'] as unknown[]).map(String) : [];
  const cx = dict(wz['陳兵出鄉']);

  const flagCard = (g: Record<string, unknown>, side: string, x: number) => {
    const color = FLAG_COLOR[str(g['旗色'])] ?? '#e8e0cc';
    return (
      <g key={side}>
        <text x={x} y={22} textAnchor="middle" fill="#9d94a8" fontSize="11">{side} · 算數 {num(g['算數'])}（個位 {num(g['數位'])}）</text>
        <FormationShape kind={str(g['陣型'])} color={color} x={x} y={56} />
        <text x={x} y={92} textAnchor="middle" fill={color} fontSize="12">{str(g['陣型'])} · {str(g['旗色'])}</text>
        <text x={x} y={108} textAnchor="middle" fill="#9d94a8" fontSize="11">置於{str(g['方位'])}</text>
      </g>
    );
  };

  // 八陣环形（握機居中）
  const R = 62; const ecx = 330; const ecy = 64;
  return (
    <div className="pan-extra">
      <svg viewBox="0 0 420 130" className="wz-svg" role="img" aria-label="五陣置旗與八陣示意">
        {flagCard(home, '主陣', 70)}
        {flagCard(away, '客陣', 185)}
        <circle cx={ecx} cy={ecy} r={16} fill="none" stroke="#d4af37" strokeWidth="1.5" />
        <text x={ecx} y={ecy + 4} textAnchor="middle" fill="#d4af37" fontSize="11">握機</text>
        {eight.map((name, i) => {
          const ang = (-90 + i * 45) * (Math.PI / 180);
          const x = ecx + R * 0.78 * Math.cos(ang);
          const y = ecy + R * 0.78 * Math.sin(ang);
          return <text key={name} x={x} y={y + 4} textAnchor="middle" fill="#e8e0cc" fontSize="12">{name}</text>;
        })}
        {(['主', '客'] as const).map((side) => {
          const dir = str(cx[side]);
          const ang = DIR_ANGLE[dir];
          if (ang === undefined) return null;
          const rad = ang * (Math.PI / 180);
          const x = ecx + (R + 14) * Math.cos(rad);
          const y = ecy + (R + 14) * Math.sin(rad);
          return (
            <text key={side} x={x} y={y + 4} textAnchor="middle"
              fill={side === '主' ? '#5aa87a' : '#dc4848'} fontSize="11">
              {side}出{dir}
            </text>
          );
        })}
      </svg>
      <p className="pan-note">{str(wz['八陣要訣'])}；陳兵出鄉——主往{str(cx['主'])}、客往{str(cx['客'])}。旗色陣型依主客算數個位（上游規則直出）。</p>
    </div>
  );
}
