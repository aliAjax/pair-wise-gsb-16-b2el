// 判断层：待检规则与调机限制，全部为纯函数，不碰界面和存储

import type { EarReading, EarSide, PendingInspection } from "./types";

export const MIN_RUNTIME_HOURS = 10; // 续航不足 10 小时进待检
export const MAX_BATTERY_GAP_PERCENT = 20; // 充电后两耳电量差超过 20% 进待检
export const MAX_DISCONNECTS_PER_DAY = 3; // 一天断连达到 3 次进待检

export interface EarEvaluation {
  ear: EarSide;
  reasons: string[];
}

/**
 * 评估一次双耳回访，返回每只耳触发的待检原因（空数组 = 正常）。
 * 电量差规则只把充电后电量较低的那只耳列入待检。
 */
export function evaluateFollowUp(left: EarReading, right: EarReading): EarEvaluation[] {
  const evaluations: Record<EarSide, EarEvaluation> = {
    left: { ear: "left", reasons: [] },
    right: { ear: "right", reasons: [] },
  };
  const readings: Record<EarSide, EarReading> = { left, right };

  (Object.keys(readings) as EarSide[]).forEach((ear) => {
    const reading = readings[ear];
    if (reading.runtimeHours < MIN_RUNTIME_HOURS) {
      evaluations[ear].reasons.push(
        `续航 ${reading.runtimeHours} 小时，不足 ${MIN_RUNTIME_HOURS} 小时`
      );
    }
    if (reading.disconnectCount >= MAX_DISCONNECTS_PER_DAY) {
      evaluations[ear].reasons.push(
        `一天断连 ${reading.disconnectCount} 次，达到 ${MAX_DISCONNECTS_PER_DAY} 次`
      );
    }
  });

  const gap = Math.abs(left.batteryAfterCharge - right.batteryAfterCharge);
  if (gap > MAX_BATTERY_GAP_PERCENT) {
    const weakerEar: EarSide =
      left.batteryAfterCharge <= right.batteryAfterCharge ? "left" : "right";
    evaluations[weakerEar].reasons.push(
      `充电后两耳电量差 ${gap}%，超过 ${MAX_BATTERY_GAP_PERCENT}%`
    );
  }

  return [evaluations.left, evaluations.right];
}

/** 该用户这只耳是否存在未结案的待检项 */
export function findOpenInspection(
  pendingInspections: PendingInspection[],
  patientName: string,
  ear: EarSide
): PendingInspection | undefined {
  return pendingInspections.find(
    (item) =>
      item.status === "pending" &&
      item.patientName === patientName &&
      item.ear === ear
  );
}

/** 检测结论回来前，该耳不能新建调机 */
export function canCreateTuning(
  pendingInspections: PendingInspection[],
  patientName: string,
  ear: EarSide
): { allowed: true } | { allowed: false; blocking: PendingInspection } {
  const blocking = findOpenInspection(pendingInspections, patientName, ear);
  return blocking ? { allowed: false, blocking } : { allowed: true };
}
