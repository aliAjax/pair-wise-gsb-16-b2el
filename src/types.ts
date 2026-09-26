// 资料层：回访记录台用到的全部数据结构

export type EarSide = "left" | "right";

export const EAR_LABELS: Record<EarSide, string> = {
  left: "左耳",
  right: "右耳",
};

export const EAR_ORDER: EarSide[] = ["left", "right"];

/** 单耳一次回访登记的数据 */
export interface EarReading {
  batteryBeforeCharge: number; // 充电前电量 %
  batteryAfterCharge: number; // 充电后电量 %
  runtimeHours: number; // 续航小时
  disconnectCount: number; // 一天断连次数
}

/** 一次回访记录（双耳） */
export interface FollowUpRecord {
  id: string;
  patientName: string;
  visitDate: string;
  deviceSerial: string;
  left: EarReading;
  right: EarReading;
  note: string;
  createdAt: string;
}

/** 待检项：触发规则的耳别，保留原输入快照 */
export interface PendingInspection {
  id: string;
  recordId: string;
  patientName: string;
  ear: EarSide;
  deviceSerial: string;
  reasons: string[];
  reading: EarReading; // 触发时的原始输入，不随回访记录改动
  status: "pending" | "resolved";
  conclusion: string; // 检测结论
  openedAt: string;
  resolvedAt: string | null;
}

/** 调机记录 */
export interface TuningRecord {
  id: string;
  patientName: string;
  ear: EarSide;
  deviceSerial: string;
  detail: string;
  createdAt: string;
}

export type ExchangeKind = "return" | "replace";

export const EXCHANGE_LABELS: Record<ExchangeKind, string> = {
  return: "寄回",
  replace: "换机",
};

/** 寄回 / 换机记录，保留新旧序列号 */
export interface DeviceExchange {
  id: string;
  patientName: string;
  ear: EarSide;
  kind: ExchangeKind;
  oldSerial: string;
  newSerial: string;
  date: string;
  note: string;
  createdAt: string;
}

/** 本机保存的完整状态 */
export interface FollowUpState {
  followUps: FollowUpRecord[];
  pendingInspections: PendingInspection[];
  tunings: TuningRecord[];
  exchanges: DeviceExchange[];
}
