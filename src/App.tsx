import { useEffect, useState } from "react";
import "./styles.css";
import {
  AppState,
  EarFlag,
  PendingInspection,
  FollowUpRecord,
  TuningRecord,
  DeviceExchange,
} from "./domain/types";
import { collectUsers, evaluateEars, findBlockingInspection } from "./domain/rules";
import { loadState, saveState } from "./storage/localStore";
import { uid } from "./utils";
import { FollowUpForm, FollowUpInput } from "./ui/FollowUpForm";
import { PendingBoard } from "./ui/PendingBoard";
import { TuningPanel, TuningInput } from "./ui/TuningPanel";
import { ExchangePanel, ExchangeInput } from "./ui/ExchangePanel";
import { RecordList } from "./ui/RecordList";

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={tone} />
    </article>
  );
}

function App() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const knownUsers = collectUsers(state);

  /** 保存回访：按耳评估，命中的耳生成待检并保留原输入 */
  const addFollowUp = (input: FollowUpInput): EarFlag[] => {
    const flags = evaluateEars(input.ears);
    const now = Date.now();
    const record: FollowUpRecord = {
      id: uid(),
      userId: input.userId,
      userName: input.userName,
      visitDate: input.visitDate,
      note: input.note,
      ears: input.ears,
      flags,
      createdAt: now,
    };
    const newPending: PendingInspection[] = flags.map((flag) => ({
      id: uid(),
      userId: input.userId,
      userName: input.userName,
      side: flag.side,
      reasons: flag.reasons,
      source: input.ears.find((ear) => ear.side === flag.side)!,
      sourceRecordId: record.id,
      status: "pending",
      conclusion: "",
      createdAt: now,
      resolvedAt: null,
    }));
    setState((prev) => ({
      ...prev,
      records: [record, ...prev.records],
      pending: [...newPending, ...prev.pending],
    }));
    return flags;
  };

  const resolvePending = (id: string, conclusion: string) => {
    setState((prev) => ({
      ...prev,
      pending: prev.pending.map((item) =>
        item.id === id
          ? { ...item, status: "resolved", conclusion, resolvedAt: Date.now() }
          : item
      ),
    }));
  };

  /** 新建调机：该耳有待检未出结论时拒绝 */
  const addTuning = (input: TuningInput): string | null => {
    const blocking = findBlockingInspection(state.pending, input.userId, input.side);
    if (blocking) {
      return "该耳有待检未出结论，检测结论回来前不能新建调机。";
    }
    const known = knownUsers.find((u) => u.userId === input.userId);
    const record: TuningRecord = {
      id: uid(),
      userId: input.userId,
      userName: known?.userName ?? "",
      side: input.side,
      detail: input.detail,
      createdAt: Date.now(),
    };
    setState((prev) => ({ ...prev, tunings: [record, ...prev.tunings] }));
    return null;
  };

  const addExchange = (input: ExchangeInput): string | null => {
    if (!input.userId) return "请填写用户编号";
    if (!input.oldSerial) return "请填写旧序列号";
    if (input.kind === "replace" && !input.newSerial) return "换机需填写新序列号";
    if (input.newSerial && input.newSerial.toLowerCase() === input.oldSerial.toLowerCase()) {
      return "新旧序列号不能相同";
    }
    const known = knownUsers.find((u) => u.userId === input.userId);
    const entry: DeviceExchange = {
      id: uid(),
      userId: input.userId,
      userName: known?.userName ?? "",
      side: input.side,
      kind: input.kind,
      oldSerial: input.oldSerial,
      newSerial: input.newSerial,
      note: input.note,
      createdAt: Date.now(),
    };
    setState((prev) => ({ ...prev, exchanges: [entry, ...prev.exchanges] }));
    return null;
  };

  const openPending = state.pending.filter((p) => p.status === "pending").length;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-01 · port 5101</p>
          <h1>助听器回访记录台</h1>
          <p className="subtitle">
            助听器带回家后，按耳登记充电前后电量、续航和断连次数；续航不足 10 小时、充电后两耳电量差超过
            20% 或一天断连 3 次的耳自动进入待检，检测结论回来前该耳不能新建调机；寄回或换机记下新旧序列号，旧设备经历随时可查。
          </p>
        </div>
        <div className="stack-card">
          <span>数据保存</span>
          <strong>本机 localStorage，重开页面记录、待检项和换机经过都在</strong>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="回访记录" value={state.records.length} tone="status-ok" />
        <MetricCard label="待检未出结论" value={openPending} tone={openPending ? "status-danger" : "status-ok"} />
        <MetricCard label="调机记录" value={state.tunings.length} tone="status-watch" />
        <MetricCard label="寄回 / 换机" value={state.exchanges.length} tone="status-watch" />
      </section>

      <FollowUpForm knownUsers={knownUsers} onSubmit={addFollowUp} />

      <div className="two-col">
        <PendingBoard pending={state.pending} onResolve={resolvePending} />
        <TuningPanel
          knownUsers={knownUsers}
          tunings={state.tunings}
          blocker={(userId, side) => findBlockingInspection(state.pending, userId, side)}
          onAdd={addTuning}
        />
      </div>

      <ExchangePanel knownUsers={knownUsers} exchanges={state.exchanges} onAdd={addExchange} />

      <RecordList records={state.records} />

      <datalist id="known-users">
        {knownUsers.map((u) => (
          <option key={u.userId} value={u.userId}>
            {u.userName}
          </option>
        ))}
      </datalist>
    </main>
  );
}

export default App;
