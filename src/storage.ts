// 本机保存层：状态在 localStorage 的读写，重开页面后数据仍在

import type { FollowUpState } from "./types";

const STORAGE_KEY = "hxwl-followup-desk-v1";

export const emptyState: FollowUpState = {
  followUps: [],
  pendingInspections: [],
  tunings: [],
  exchanges: [],
};

export function loadState(): FollowUpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<FollowUpState>;
    return { ...emptyState, ...parsed };
  } catch {
    return emptyState;
  }
}

export function saveState(state: FollowUpState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用（如隐私模式）时保持界面可用，仅本次会话有效
  }
}
