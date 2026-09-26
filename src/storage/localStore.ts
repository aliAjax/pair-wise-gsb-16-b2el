/**
 * 本机保存层：状态整体读写 localStorage。
 * 首次打开写入一份示例数据；之后重开时记录、待检项、换机经过都在。
 */
import { AppState } from "../domain/types";
import { evaluateEars } from "../domain/rules";
import { today, uid } from "../utils";

const STORAGE_KEY = "hxwl-followup-v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    return normalize(JSON.parse(raw));
  } catch {
    return seedState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用（隐私模式等）时静默降级，界面照常工作
  }
}

function normalize(value: unknown): AppState {
  const fallback = emptyState();
  if (typeof value !== "object" || value === null) return fallback;
  const v = value as Partial<AppState>;
  return {
    records: Array.isArray(v.records) ? v.records : [],
    pending: Array.isArray(v.pending) ? v.pending : [],
    tunings: Array.isArray(v.tunings) ? v.tunings : [],
    exchanges: Array.isArray(v.exchanges) ? v.exchanges : [],
  };
}

function emptyState(): AppState {
  return { records: [], pending: [], tunings: [], exchanges: [] };
}

const DAY = 24 * 60 * 60 * 1000;

/** 首次打开的示例数据，展示各台账的联动 */
function seedState(): AppState {
  const now = Date.now();

  const wangEars = [
    { side: "left" as const, batteryBefore: 22, batteryAfter: 96, enduranceHours: 8.5, disconnects: 1 },
    { side: "right" as const, batteryBefore: 35, batteryAfter: 100, enduranceHours: 13, disconnects: 0 },
  ];
  const wangFlags = evaluateEars(wangEars);
  const wangRecordId = uid();

  const liuEars = [
    { side: "left" as const, batteryBefore: 40, batteryAfter: 98, enduranceHours: 12, disconnects: 0 },
    { side: "right" as const, batteryBefore: 18, batteryAfter: 72, enduranceHours: 11, disconnects: 4 },
  ];
  const liuFlags = evaluateEars(liuEars);
  const liuRecordId = uid();

  return {
    records: [
      {
        id: wangRecordId,
        userId: "Wang-031",
        userName: "王秀兰",
        visitDate: today(),
        note: "充电盒反映掉电快，左耳下午常提示低电。",
        ears: wangEars,
        flags: wangFlags,
        createdAt: now - 2 * 60 * 60 * 1000,
      },
      {
        id: liuRecordId,
        userId: "Liu-024",
        userName: "刘建国",
        visitDate: today(),
        note: "右耳接电话时断连，已现场复现一次。",
        ears: liuEars,
        flags: liuFlags,
        createdAt: now - DAY,
      },
    ],
    pending: [
      {
        id: uid(),
        userId: "Wang-031",
        userName: "王秀兰",
        side: "left",
        reasons: wangFlags.find((f) => f.side === "left")?.reasons ?? [],
        source: wangEars[0],
        sourceRecordId: wangRecordId,
        status: "pending",
        conclusion: "",
        createdAt: now - 2 * 60 * 60 * 1000,
        resolvedAt: null,
      },
      {
        id: uid(),
        userId: "Liu-024",
        userName: "刘建国",
        side: "right",
        reasons: liuFlags.find((f) => f.side === "right")?.reasons ?? [],
        source: liuEars[1],
        sourceRecordId: liuRecordId,
        status: "resolved",
        conclusion: "固件旧版本断连已知问题，已升级并重新配对，观察一周。",
        createdAt: now - DAY,
        resolvedAt: now - 20 * 60 * 60 * 1000,
      },
    ],
    tunings: [
      {
        id: uid(),
        userId: "Liu-024",
        userName: "刘建国",
        side: "left",
        detail: "2kHz 后增益提高 3dB，用户反馈路口提示音更清晰。",
        createdAt: now - DAY,
      },
    ],
    exchanges: [
      {
        id: uid(),
        userId: "Chen-118",
        userName: "陈立",
        side: "right",
        kind: "return",
        oldSerial: "HA-R-55301",
        newSerial: "",
        note: "充电触点氧化，寄厂检测。",
        createdAt: now - 3 * DAY,
      },
      {
        id: uid(),
        userId: "Liu-024",
        userName: "刘建国",
        side: "right",
        kind: "replace",
        oldSerial: "HA-R-77102",
        newSerial: "HA-R-80445",
        note: "断连反复，直接换新。",
        createdAt: now - 2 * DAY,
      },
    ],
  };
}
