import { useEffect, useMemo, useState } from 'react';
import { calculateTaiyi, calculateMingfa, loadStarsData, findStars, starsLoaded } from './taiyi';
import type { MingfaResult, Sex, TaiyiInput, TaiyiResult } from './taiyi';
import { InputPanel } from './components/InputPanel';
import { Board } from './components/Board';
import { ResultPanel } from './components/ResultPanel';
import { MingfaPanel } from './components/MingfaPanel';
import { ExportBar } from './components/ExportBar';

function defaultInput(): TaiyiInput {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    jiStyle: 3,
    acumYear: 0,
  };
}

export default function App() {
  const [input, setInput] = useState<TaiyiInput>(defaultInput);
  const [sex, setSex] = useState<Sex>('男');
  const [showMingfa, setShowMingfa] = useState(false);
  const [showTenjing, setShowTenjing] = useState(false);
  const [tenjingReady, setTenjingReady] = useState(false);
  const [tenjingError, setTenjingError] = useState<string | null>(null);

  useEffect(() => {
    if (!showTenjing || starsLoaded()) return;
    let cancelled = false;
    loadStarsData()
      .then(() => { if (!cancelled) { setTenjingReady(true); setTenjingError(null); } })
      .catch((e: unknown) => {
        if (!cancelled) setTenjingError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [showTenjing]);

  const { result, error } = useMemo<{ result: TaiyiResult | null; error: string | null }>(() => {
    try {
      return { result: calculateTaiyi(input), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [input]);

  const mingfa = useMemo<MingfaResult | null>(() => {
    if (!showMingfa || !result) return null;
    try {
      return calculateMingfa(input, sex);
    } catch {
      return null;
    }
  }, [input, sex, showMingfa, result]);

  const planets = useMemo(() => {
    if (!showTenjing || !tenjingReady) return null;
    return findStars(input.year, input.month, input.day);
  }, [showTenjing, tenjingReady, input.year, input.month, input.day]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>太乙神数</h1>
        <p className="subtitle">
          年 · 月 · 日 · 时 · 分五计式排盘 — 算法汇集自开源项目 kintaiyi / taiyipython
        </p>
      </header>

      <InputPanel
        value={input}
        onChange={setInput}
        sex={sex}
        onSexChange={setSex}
        showMingfa={showMingfa}
        onShowMingfaChange={setShowMingfa}
        showTenjing={showTenjing}
        onShowTenjingChange={setShowTenjing}
        tenjingLoading={showTenjing && !tenjingReady && !tenjingError}
      />

      {error && <div className="error">排盘失败：{error}</div>}
      {tenjingError && <div className="error">十精数据加载失败：{tenjingError}</div>}

      {result && (
        <>
          <ExportBar payload={{ result, mingfa, planets }} />
          <main className="content">
            <Board result={result} planets={planets} />
            <div className="result-panel">
              {mingfa && <MingfaPanel mingfa={mingfa} />}
              <ResultPanel result={result} />
            </div>
          </main>
        </>
      )}

      <footer className="app-footer">
        算法参照 <a href="https://github.com/kentang2017/kintaiyi" target="_blank" rel="noreferrer">kentang2017/kintaiyi</a>（MIT）
        与 <a href="https://github.com/wlhyl/taiyipython" target="_blank" rel="noreferrer">wlhyl/taiyipython</a>；
        历法由 lunar-typescript 提供。仅供术数文化研究。
      </footer>
    </div>
  );
}
