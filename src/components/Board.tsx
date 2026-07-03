import type { GongName, TaiyiResult } from '../taiyi';
import { SIXTEEN_GOD } from '../taiyi';

/** 5×5 式盘布局：外环十六辰（南上北下），内三×三为九宫 */
const RIM_LAYOUT: Array<Array<GongName | null>> = [
  ['巽', '巳', '午', '未', '坤'],
  ['辰', null, null, null, '申'],
  ['卯', null, null, null, '酉'],
  ['寅', null, null, null, '戌'],
  ['艮', '丑', '子', '亥', '乾'],
];

/** 内宫（行、列从 1 起）：宫数与阴阳气标注（依传统十六神式盘布局） */
const INNER: Record<string, { gong: number; note?: string }> = {
  '1,1': { gong: 9, note: '絕陰' },
  '1,2': { gong: 2, note: '易氣' },
  '1,3': { gong: 7 },
  '2,1': { gong: 4, note: '絕氣' },
  '2,2': { gong: 5 },
  '2,3': { gong: 6, note: '絕氣' },
  '3,1': { gong: 3 },
  '3,2': { gong: 8, note: '易氣' },
  '3,3': { gong: 1, note: '絕陽' },
};

const STAR_CLASS: Record<string, string> = {
  太乙: 'star-taiyi',
  文昌: 'star-key', 始擊: 'star-key', 定計: 'star-key',
  主大: 'star-home', 主參: 'star-home',
  客大: 'star-away', 客參: 'star-away',
};

interface Props {
  result: TaiyiResult;
  /** 十精：地支 -> 行星名（启用后传入） */
  planets?: Record<string, string[]> | null;
}

export function Board({ result, planets }: Props) {
  const { board, doors, wangZhuai } = result;

  const renderStars = (names: string[], chen?: string) => (
    <div className="stars">
      {names.map((n, i) => (
        <span key={`${n}-${i}`} className={`star ${STAR_CLASS[n] ?? ''}`}>{n}</span>
      ))}
      {chen && planets?.[chen]?.map((p) => (
        <span key={`p-${p}`} className="star star-planet">{p}</span>
      ))}
    </div>
  );

  return (
    <div className="board">
      {RIM_LAYOUT.map((row, r) =>
        row.map((chen, c) => {
          if (chen !== null) {
            const isTaiyi = board[chen].includes('太乙');
            return (
              <div key={`${r}-${c}`} className={`cell rim ${isTaiyi ? 'has-taiyi' : ''}`}>
                <div className="cell-head">
                  <span className="god-name">{SIXTEEN_GOD[chen]}</span>
                  <span className="chen-name">{chen}</span>
                </div>
                {renderStars(board[chen], chen)}
              </div>
            );
          }
          const inner = INNER[`${r},${c}`];
          if (inner.gong === 5) {
            return (
              <div key={`${r}-${c}`} className="cell inner center">
                <div className="cell-head">
                  <span className="gong-num">五</span>
                  <span className="chen-name">中宮</span>
                </div>
                {renderStars(board['中'])}
              </div>
            );
          }
          return (
            <div key={`${r}-${c}`} className="cell inner">
              <div className="cell-head">
                <span className="gong-num">{'一二三四五六七八九'[inner.gong - 1]}宮</span>
                {inner.note && <span className="inner-note">{inner.note}</span>}
              </div>
              <div className="inner-info">
                {doors[inner.gong] && <span className="door">{doors[inner.gong]}門</span>}
                {wangZhuai[inner.gong] && <span className="wz">{wangZhuai[inner.gong]}</span>}
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}
