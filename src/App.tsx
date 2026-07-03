import { useEffect, useMemo, useState } from 'react';
import {
  calculateTaiyi, calculateMingfa, calculateHuangji, loadStarsData, findStars, starsLoaded, applyTrueSolarTime,
} from './taiyi';
import type { HuangjiInfo, HuangjiSchool, MingfaResult, Sex, SolarTimeInfo, TaiyiInput, TaiyiResult } from './taiyi';
import { findLongitude } from './lib/cities';
import { InputPanel } from './components/InputPanel';
import type { SolarTimeSetting } from './components/InputPanel';
import { Board } from './components/Board';
import { ResultPanel } from './components/ResultPanel';
import { MingfaPanel } from './components/MingfaPanel';
import { HuangjiPanel } from './components/HuangjiPanel';
import { ExportCard } from './components/ExportCard';
import { GuidePage } from './components/GuidePage';
import { ToastProvider } from './components/Toast';

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
  const [view, setView] = useState<'pan' | 'guide'>('pan');
  const [input, setInput] = useState<TaiyiInput>(defaultInput);
  const [sex, setSex] = useState<Sex>('男');
  const [showMingfa, setShowMingfa] = useState(false);
  const [showTenjing, setShowTenjing] = useState(false);
  const [tenjingReady, setTenjingReady] = useState(false);
  const [tenjingError, setTenjingError] = useState<string | null>(null);
  const [showHuangji, setShowHuangji] = useState(false);
  const [huangjiSchool, setHuangjiSchool] = useState<HuangjiSchool>('黄畿');
  const [solar, setSolar] = useState<SolarTimeSetting>({
    enabled: false,
    province: '北京',
    city: '北京',
    district: '市区',
  });

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

  // 真太阳时校正后的实际排盘输入
  const { effectiveInput, solarInfo } = useMemo<{
    effectiveInput: TaiyiInput;
    solarInfo: SolarTimeInfo;
  }>(() => {
    if (!solar.enabled) return { effectiveInput: input, solarInfo: { applied: false } };
    const lng = findLongitude(solar.province, solar.city, solar.district);
    if (lng === undefined) return { effectiveInput: input, solarInfo: { applied: false } };
    const adjusted = applyTrueSolarTime(input.year, input.month, input.day, input.hour, input.minute, lng);
    const place = solar.district === '市区' ? solar.city : `${solar.city}·${solar.district}`;
    return {
      effectiveInput: { ...input, ...adjusted },
      solarInfo: {
        applied: true,
        place,
        longitude: lng,
        offsetMinutes: adjusted.offsetMinutes,
        adjusted: {
          year: adjusted.year, month: adjusted.month, day: adjusted.day,
          hour: adjusted.hour, minute: adjusted.minute,
        },
      },
    };
  }, [input, solar]);

  const { result, error } = useMemo<{ result: TaiyiResult | null; error: string | null }>(() => {
    try {
      return { result: calculateTaiyi(effectiveInput), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [effectiveInput]);

  const mingfa = useMemo<MingfaResult | null>(() => {
    if (!showMingfa || !result) return null;
    try {
      return calculateMingfa(effectiveInput, sex);
    } catch {
      return null;
    }
  }, [effectiveInput, sex, showMingfa, result]);

  const planets = useMemo(() => {
    if (!showTenjing || !tenjingReady) return null;
    return findStars(effectiveInput.year, effectiveInput.month, effectiveInput.day);
  }, [showTenjing, tenjingReady, effectiveInput.year, effectiveInput.month, effectiveInput.day]);

  const huangji = useMemo<HuangjiInfo | null>(() => {
    if (!showHuangji || !result) return null;
    try {
      return calculateHuangji(effectiveInput.year, huangjiSchool, {
        monthGz: result.ganzhi[1],
        dayGz: result.ganzhi[2],
        hourBranch: result.ganzhi[3][1],
      });
    } catch {
      return null;
    }
  }, [showHuangji, huangjiSchool, effectiveInput.year, result]);

  const solarHint = solarInfo.applied
    ? `${solarInfo.offsetMinutes! >= 0 ? '+' : ''}${solarInfo.offsetMinutes} 分钟 → ${String(solarInfo.adjusted!.hour).padStart(2, '0')}:${String(solarInfo.adjusted!.minute).padStart(2, '0')} 起局`
    : null;

  return (
    <ToastProvider>
      <div className="app">
        <div className="bg-ornament" aria-hidden="true" />
        <header className="app-header">
          <h1>太乙神数</h1>
          <p className="subtitle">
            三式之首 · 年月日时分五计式 · 算法汇集自开源项目 kintaiyi / taiyipython
          </p>
          <nav className="view-tabs">
            <button
              type="button"
              className={view === 'pan' ? 'active' : ''}
              onClick={() => { setView('pan'); window.scrollTo(0, 0); }}
            >
              ☰ 排盘
            </button>
            <button
              type="button"
              className={view === 'guide' ? 'active' : ''}
              onClick={() => { setView('guide'); window.scrollTo(0, 0); }}
            >
              ✎ 使用说明
            </button>
          </nav>
        </header>

        {view === 'guide' && <GuidePage />}

        <div style={{ display: view === 'pan' ? 'contents' : 'none' }}>
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
          showHuangji={showHuangji}
          onShowHuangjiChange={setShowHuangji}
          huangjiSchool={huangjiSchool}
          onHuangjiSchoolChange={setHuangjiSchool}
          solar={solar}
          onSolarChange={setSolar}
          solarHint={solarHint}
        />

        {error && <div className="error">排盘失败：{error}</div>}
        {tenjingError && <div className="error">十精数据加载失败：{tenjingError}</div>}

        {result && (
          <>
            <main className="content">
              <Board result={result} planets={planets} />
              <div className="result-panel">
                {huangji && <HuangjiPanel info={huangji} />}
                {mingfa && <MingfaPanel mingfa={mingfa} />}
                <ResultPanel result={result} solarInfo={solarInfo} />
              </div>
            </main>
            <ExportCard payload={{ result, mingfa, planets, solarTime: solarInfo, huangji }} />
          </>
        )}
        </div>

        <footer className="app-footer">
          算法参照 <a href="https://github.com/kentang2017/kintaiyi" target="_blank" rel="noreferrer">kentang2017/kintaiyi</a>（MIT）
          与 <a href="https://github.com/wlhyl/taiyipython" target="_blank" rel="noreferrer">wlhyl/taiyipython</a>；
          历法由 lunar-typescript 提供。仅供术数文化研究。
        </footer>
      </div>
    </ToastProvider>
  );
}
