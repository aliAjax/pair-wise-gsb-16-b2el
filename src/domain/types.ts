/**
 * 资料层：回访记录台涉及的全部数据模型。
 * 只放类型与常量，不含判断逻辑、不含读写、不含界面。
 */

export type EarSide = "left" | "right";

export const EAR_LABEL: Record<EarSide, string> = {
  left: "左耳",
  right: "右耳",
};

export const EAR_ORDER: EarSide[] = ["left", "right"];

/** 单耳一次回访登记的原始输入 */
export interface EarReading {
  side: EarSide;
  /** 充电前电量 % */
  batteryBefore: number;
  /** 充电后电量 % */
  batteryAfter: number;
  /** 续航小时 */
  enduranceHours: number;
  /** 当天断连次数 */
  disconnects: number;
}

/** 某只耳被判定进入待检时命中的原因 */
export interface EarFlag {
  side: EarSide;
  reasons: string[];
}

/** 一次回访记录（按耳登记） */
export interface FollowUpRecord {
  id: string;
  userId: string;
  userName: string;
  /** 回访日期 YYYY-MM-DD */
  visitDate: string;
  note: string;
  ears: EarReading[];
  /** 保存时按当时阈值算出的标记，阈值日后调整不影响历史结论 */
  flags: EarFlag[];
  createdAt: number;
}

/** 待检项：检测结论回来前一直挂着 */
export interface PendingInspection {
  id: string;
  userId: string;
  userName: string;
  side: EarSide;
  reasons: string[];
  /** 触发时的原输入快照，保留原输入 */
  source: EarReading;
  sourceRecordId: string;
  status: "pending" | "resolved";
  /** 检测结论 */
  conclusion: string;
  createdAt: number;
  resolvedAt: number | null;
}

/** 调机记录 */
export interface TuningRecord {
  id: string;
  userId: string;
  userName: string;
  side: EarSide;
  detail: string;
  createdAt: number;
}

export type ExchangeKind = "return" | "replace";

export const EXCHANGE_LABEL: Record<ExchangeKind, string> = {
  return: "寄回",
  replace: "换机",
};

/** 寄回 / 换机登记，记下新旧序列号 */
export interface DeviceExchange {
  id: string;
  userId: string;
  userName: string;
  side: EarSide;
  kind: ExchangeKind;
  oldSerial: string;
  /** 寄回未补机时可为空串 */
  newSerial: string;
  note: string;
  createdAt: number;
}

/** 本机保存的整份状态 */
export interface AppState {
  records: FollowUpRecord[];
  pending: PendingInspection[];
  tunings: TuningRecord[];
  exchanges: DeviceExchange[];
}
