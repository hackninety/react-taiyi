import { useEffect, useRef, useState } from 'react';

interface Props {
  /** pan.svg 地址（后端可用时传入，否则 null） */
  url: string | null;
  /** 后端不可用时的说明 */
  note?: string;
}

/**
 * kintaiyi 原生圆盘（上游 drawsvg 渲染，经 python-taiyi 后端输出 SVG）。
 * 与本地方盘同源同参，随上游渲染样式实时更新；后端不可用时显示占位说明。
 */
export function CircularBoard({ url, note }: Props) {
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // 若图片在监听器挂上前已完成（本地缓存/极快返回），onLoad 不会再触发——直接判定
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setState('ok');
    else setState('loading');
  }, [url]);

  if (!url) {
    return (
      <div className="circular-board placeholder">
        <span>◯ 圆盘由 kintaiyi 后端原生渲染{note ? `——${note}` : ''}</span>
      </div>
    );
  }
  return (
    <div className={`circular-board ${state}`}>
      {state === 'loading' && <span className="cb-hint">圆盘加载中…</span>}
      {state === 'err' && <span className="cb-hint">圆盘加载失败（后端 SVG 不可用），方盘不受影响</span>}
      <img
        ref={imgRef}
        src={url}
        alt="kintaiyi 原生太乙圆盘"
        style={{ display: state === 'err' ? 'none' : undefined }}
        onLoad={() => setState('ok')}
        onError={() => setState('err')}
      />
    </div>
  );
}
