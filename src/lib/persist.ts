/**
 * 起局表单的本地持久化：只存**输入项**（年月日时分/计式/流派/开关/真太阳时/常居住地），
 * 盘面与全解释等派生结果一律由输入重新推算，故刷新后恢复到上次起局状态而非丢失。
 *
 * - 键统一 `taiyi.` 前缀，值带 schema 版本号；版本不符或解析失败即回退默认（容忍旧结构）。
 * - localStorage 不可用（隐私模式/SSR）时静默降级为普通内存状态。
 */
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const PREFIX = 'taiyi.';
/** 表单结构变更时 +1，旧持久化数据自动作废回退默认（如常居住地曾由三级改自由文本） */
const SCHEMA_VERSION = 2;

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { v?: number; d?: unknown };
    if (parsed?.v !== SCHEMA_VERSION || parsed.d === undefined) return fallback;
    // 对象型：以默认为底浅合并，容忍新增字段
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)
      && parsed.d && typeof parsed.d === 'object' && !Array.isArray(parsed.d)) {
      return { ...fallback, ...(parsed.d as object) } as T;
    }
    return parsed.d as T;
  } catch {
    return fallback;
  }
}

function savePersisted<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: SCHEMA_VERSION, d: data }));
  } catch {
    /* 配额满 / 隐私模式：忽略 */
  }
}

/** 与 useState 同签名的持久化状态：初值取自 localStorage（无则用 initial），变更即写回 */
export function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    return loadPersisted(key, fallback);
  });
  // 跳过首次渲染的写回（值就是刚读出来的），仅在后续变更时保存
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    savePersisted(key, state);
  }, [key, state]);
  return [state, setState];
}
