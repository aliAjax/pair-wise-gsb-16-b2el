/**
 * 判断层：阈值、待检判定、调机拦截、设备经历推导。
 * 只依赖类型，不碰存储和界面。
 */
import {
  AppState,
  DeviceExchange,
  EarFlag,
  EarReading,
  EarSide,
  PendingInspection,
} from "./types";

/** 待检触发阈值，集中一处便于调整 */
export const THRESHOLDS = {
  /** 续航不足该小时数 */
  minEnduranceHours: 10,
  /** 充电后两耳电量差超过该百分比 */
  maxBatteryGapPercent: 20,
  /** 一天断连达到该次数 */
  maxDisconnectsPerDay: 3,
} as const;

/**
 * 按耳评估一次回访输入，返回需要进入待检的耳及原因。
 * 电量差是两耳之间的比较，无法分辨哪只异常时两只都标记。
 */
export function evaluateEars(ears: EarReading[]): EarFlag[] {
  const reasonsBySide = new Map<EarSide, string[]>();

  const push = (side: EarSide, reason: string) => {
    const list = reasonsBySide.get(side) ?? [];
    list.push(reason);
    reasonsBySide.set(side, list);
  };

  for (const ear of ears) {
    if (ear.enduranceHours < THRESHOLDS.minEnduranceHours) {
      push(
        ear.side,
        `续航 ${ear.enduranceHours} 小时，不足 ${THRESHOLDS.minEnduranceHours} 小时`
      );
    }
    if (ear.disconnects >= THRESHOLDS.maxDisconnectsPerDay) {
      push(
        ear.side,
        `一天断连 ${ear.disconnects} 次，达到 ${THRESHOLDS.maxDisconnectsPerDay} 次`
      );
    }
  }

  const left = ears.find((ear) => ear.side === "left");
  const right = ears.find((ear) => ear.side === "right");
  if (left && right) {
    const gap = Math.abs(left.batteryAfter - right.batteryAfter);
    if (gap > THRESHOLDS.maxBatteryGapPercent) {
      const reason = `充电后两耳电量差 ${gap}%（左 ${left.batteryAfter}% / 右 ${right.batteryAfter}%），超过 ${THRESHOLDS.maxBatteryGapPercent}%`;
      push("left", reason);
      push("right", reason);
    }
  }

  return [...reasonsBySide.entries()].map(([side, reasons]) => ({ side, reasons }));
}

/** 该用户该耳是否有未出结论的待检项；有则返回它，用于拦截新建调机 */
export function findBlockingInspection(
  pending: PendingInspection[],
  userId: string,
  side: EarSide
): PendingInspection | undefined {
  return pending.find(
    (item) => item.userId === userId && item.side === side && item.status === "pending"
  );
}

export interface DeviceEvent {
  at: number;
  userId: string;
  userName: string;
  side: EarSide;
  kind: DeviceExchange["kind"];
  /** 该序列号在这次登记里的角色 */
  role: "installed" | "sent-out";
  counterpart: string;
  note: string;
}

/** 按序列号还原一只设备的经历：何时装机到谁、何时寄回或被换下 */
export function deviceHistory(exchanges: DeviceExchange[], serial: string): DeviceEvent[] {
  const key = serial.trim().toLowerCase();
  if (!key) return [];

  const events: DeviceEvent[] = [];
  for (const ex of exchanges) {
    const base = {
      at: ex.createdAt,
      userId: ex.userId,
      userName: ex.userName,
      side: ex.side,
      kind: ex.kind,
      note: ex.note,
    };
    if (ex.newSerial.trim().toLowerCase() === key) {
      events.push({ ...base, role: "installed", counterpart: ex.oldSerial });
    }
    if (ex.oldSerial.trim().toLowerCase() === key) {
      events.push({ ...base, role: "sent-out", counterpart: ex.newSerial });
    }
  }
  return events.sort((a, b) => a.at - b.at);
}

export interface UserRef {
  userId: string;
  userName: string;
}

/** 从各台账汇总出现过的用户，供录入时选择 */
export function collectUsers(state: AppState): UserRef[] {
  const map = new Map<string, string>();
  const remember = (userId: string, userName: string) => {
    if (userId && !map.has(userId)) map.set(userId, userName);
  };
  for (const r of state.records) remember(r.userId, r.userName);
  for (const p of state.pending) remember(p.userId, p.userName);
  for (const t of state.tunings) remember(t.userId, t.userName);
  for (const e of state.exchanges) remember(e.userId, e.userName);
  return [...map.entries()].map(([userId, userName]) => ({ userId, userName }));
}
