// 界面层：只负责渲染和交互，数据看 types.ts，规则看 rules.ts，保存看 storage.ts

import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./styles.css";
import {
  EAR_LABELS,
  EAR_ORDER,
  EXCHANGE_LABELS,
  type DeviceExchange,
  type EarReading,
  type EarSide,
  type ExchangeKind,
  type FollowUpRecord,
  type FollowUpState,
  type PendingInspection,
} from "./types";
import { canCreateTuning, evaluateFollowUp } from "./rules";
import { loadState, saveState } from "./storage";

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

interface EarFormState {
  batteryBeforeCharge: string;
  batteryAfterCharge: string;
  runtimeHours: string;
  disconnectCount: string;
}

const blankEarForm: EarFormState = {
  batteryBeforeCharge: "",
  batteryAfterCharge: "",
  runtimeHours: "",
  disconnectCount: "",
};

function parseEarForm(form: EarFormState): EarReading | null {
  const reading: EarReading = {
    batteryBeforeCharge: Number(form.batteryBeforeCharge),
    batteryAfterCharge: Number(form.batteryAfterCharge),
    runtimeHours: Number(form.runtimeHours),
    disconnectCount: Number(form.disconnectCount),
  };
  const valid =
    Object.values(reading).every((value) => Number.isFinite(value)) &&
    reading.batteryBeforeCharge >= 0 &&
    reading.batteryBeforeCharge <= 100 &&
    reading.batteryAfterCharge >= 0 &&
    reading.batteryAfterCharge <= 100 &&
    reading.runtimeHours >= 0 &&
    reading.disconnectCount >= 0;
  return valid ? reading : null;
}

function EarReadingFieldset({
  ear,
  value,
  onChange,
}: {
  ear: EarSide;
  value: EarFormState;
  onChange: (next: EarFormState) => void;
}) {
  const update = (field: keyof EarFormState) => (e: { target: { value: string } }) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <fieldset className="ear-fieldset">
      <legend>{EAR_LABELS[ear]}</legend>
      <div className="ear-fields">
        <label>
          <span>充电前电量 %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={value.batteryBeforeCharge}
            onChange={update("batteryBeforeCharge")}
            placeholder="0-100"
          />
        </label>
        <label>
          <span>充电后电量 %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={value.batteryAfterCharge}
            onChange={update("batteryAfterCharge")}
            placeholder="0-100"
          />
        </label>
        <label>
          <span>续航（小时）</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={value.runtimeHours}
            onChange={update("runtimeHours")}
            placeholder="如 12"
          />
        </label>
        <label>
          <span>断连次数（次/天）</span>
          <input
            type="number"
            min={0}
            value={value.disconnectCount}
            onChange={update("disconnectCount")}
            placeholder="如 0"
          />
        </label>
      </div>
    </fieldset>
  );
}

function ReadingSummary({ reading }: { reading: EarReading }) {
  return (
    <p className="reading-summary">
      充电前 {reading.batteryBeforeCharge}% → 充电后 {reading.batteryAfterCharge}% · 续航{" "}
      {reading.runtimeHours} 小时 · 断连 {reading.disconnectCount} 次/天
    </p>
  );
}

function App() {
  const [state, setState] = useState<FollowUpState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // 回访登记表单
  const [patientName, setPatientName] = useState("");
  const [visitDate, setVisitDate] = useState(today());
  const [deviceSerial, setDeviceSerial] = useState("");
  const [note, setNote] = useState("");
  const [leftForm, setLeftForm] = useState<EarFormState>(blankEarForm);
  const [rightForm, setRightForm] = useState<EarFormState>(blankEarForm);
  const [formError, setFormError] = useState("");

  // 待检结论
  const [conclusions, setConclusions] = useState<Record<string, string>>({});

  // 调机表单
  const [tuningPatient, setTuningPatient] = useState("");
  const [tuningEar, setTuningEar] = useState<EarSide>("left");
  const [tuningSerial, setTuningSerial] = useState("");
  const [tuningDetail, setTuningDetail] = useState("");
  const [tuningError, setTuningError] = useState("");

  // 寄回 / 换机表单
  const [exchangePatient, setExchangePatient] = useState("");
  const [exchangeEar, setExchangeEar] = useState<EarSide>("left");
  const [exchangeKind, setExchangeKind] = useState<ExchangeKind>("replace");
  const [oldSerial, setOldSerial] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [exchangeNote, setExchangeNote] = useState("");
  const [exchangeError, setExchangeError] = useState("");

  // 设备经历查询
  const [serialQuery, setSerialQuery] = useState("");

  const openPending = useMemo(
    () => state.pendingInspections.filter((item) => item.status === "pending"),
    [state.pendingInspections]
  );

  const pendingByRecord = useMemo(() => {
    const map = new Map<string, PendingInspection[]>();
    state.pendingInspections.forEach((item) => {
      const list = map.get(item.recordId) ?? [];
      list.push(item);
      map.set(item.recordId, list);
    });
    return map;
  }, [state.pendingInspections]);

  const tuningBlock = useMemo(() => {
    if (!tuningPatient.trim()) return null;
    const result = canCreateTuning(state.pendingInspections, tuningPatient.trim(), tuningEar);
    return result.allowed ? null : result.blocking;
  }, [state.pendingInspections, tuningPatient, tuningEar]);

  const serialHistory = useMemo(() => {
    const query = serialQuery.trim();
    if (!query) return null;
    return {
      followUps: state.followUps.filter((r) => r.deviceSerial === query),
      tunings: state.tunings.filter((t) => t.deviceSerial === query),
      exchanges: state.exchanges.filter(
        (ex) => ex.oldSerial === query || ex.newSerial === query
      ),
      inspections: state.pendingInspections.filter((p) => p.deviceSerial === query),
    };
  }, [serialQuery, state]);

  function handleAddFollowUp(e: FormEvent) {
    e.preventDefault();
    const left = parseEarForm(leftForm);
    const right = parseEarForm(rightForm);
    if (!patientName.trim() || !deviceSerial.trim()) {
      setFormError("请填写用户姓名和设备序列号。");
      return;
    }
    if (!left || !right) {
      setFormError("双耳的电量、续航、断连次数都要填数字，电量在 0-100 之间。");
      return;
    }

    const record: FollowUpRecord = {
      id: createId("visit"),
      patientName: patientName.trim(),
      visitDate,
      deviceSerial: deviceSerial.trim(),
      left,
      right,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    // 判断层评估，触发规则的耳进入待检并保留原输入
    const newPending: PendingInspection[] = evaluateFollowUp(left, right)
      .filter((evaluation) => evaluation.reasons.length > 0)
      .map((evaluation) => ({
        id: createId("check"),
        recordId: record.id,
        patientName: record.patientName,
        ear: evaluation.ear,
        deviceSerial: record.deviceSerial,
        reasons: evaluation.reasons,
        reading: evaluation.ear === "left" ? { ...left } : { ...right },
        status: "pending" as const,
        conclusion: "",
        openedAt: new Date().toISOString(),
        resolvedAt: null,
      }));

    setState((prev) => ({
      ...prev,
      followUps: [record, ...prev.followUps],
      pendingInspections: [...newPending, ...prev.pendingInspections],
    }));
    setFormError("");
    setLeftForm(blankEarForm);
    setRightForm(blankEarForm);
    setNote("");
  }

  function handleResolve(item: PendingInspection) {
    const conclusion = (conclusions[item.id] ?? "").trim();
    if (!conclusion) return;
    setState((prev) => ({
      ...prev,
      pendingInspections: prev.pendingInspections.map((p) =>
        p.id === item.id
          ? { ...p, status: "resolved" as const, conclusion, resolvedAt: new Date().toISOString() }
          : p
      ),
    }));
    setConclusions((prev) => ({ ...prev, [item.id]: "" }));
  }

  function handleAddTuning(e: FormEvent) {
    e.preventDefault();
    const name = tuningPatient.trim();
    if (!name || !tuningDetail.trim()) {
      setTuningError("请填写用户姓名和调机内容。");
      return;
    }
    const check = canCreateTuning(state.pendingInspections, name, tuningEar);
    if (!check.allowed) {
      setTuningError(
        `${name} 的${EAR_LABELS[tuningEar]}仍在待检中，检测结论回来前不能新建调机。`
      );
      return;
    }
    const record = {
      id: createId("tune"),
      patientName: name,
      ear: tuningEar,
      deviceSerial: tuningSerial.trim(),
      detail: tuningDetail.trim(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, tunings: [record, ...prev.tunings] }));
    setTuningError("");
    setTuningDetail("");
  }

  function handleAddExchange(e: FormEvent) {
    e.preventDefault();
    if (!exchangePatient.trim() || !oldSerial.trim() || !newSerial.trim()) {
      setExchangeError("请填写用户姓名、旧序列号和新序列号。");
      return;
    }
    const record: DeviceExchange = {
      id: createId("exch"),
      patientName: exchangePatient.trim(),
      ear: exchangeEar,
      kind: exchangeKind,
      oldSerial: oldSerial.trim(),
      newSerial: newSerial.trim(),
      date: today(),
      note: exchangeNote.trim(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, exchanges: [record, ...prev.exchanges] }));
    setExchangeError("");
    setOldSerial("");
    setNewSerial("");
    setExchangeNote("");
  }

  const metrics = [
    { label: "回访记录", value: state.followUps.length },
    { label: "待检中的耳", value: openPending.length },
    { label: "调机记录", value: state.tunings.length },
    { label: "寄回 / 换机", value: state.exchanges.length },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-01 · 回访记录台</p>
          <h1>助听器回访记录台</h1>
          <p className="subtitle">
            按耳登记充电前后电量、续航和断连次数。续航不足 10 小时、充电后两耳电量差超过
            20% 或一天断连 3 次，该耳自动进入待检；检测结论回来前，该耳不能新建调机。
          </p>
        </div>
        <div className="stack-card">
          <span>待检规则</span>
          <strong>续航 &lt; 10h</strong>
          <strong>两耳电量差 &gt; 20%</strong>
          <strong>断连 ≥ 3 次/天</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <i className={["status-ok", "status-danger", "status-ok", "status-watch"][index]} />
          </article>
        ))}
      </section>

      <section className="workspace">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>按耳登记</p>
              <h2>新增回访记录</h2>
            </div>
          </div>
          <form onSubmit={handleAddFollowUp} className="stacked-form">
            <div className="field-grid">
              <label>
                <span>用户姓名</span>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="如 王阿姨"
                />
              </label>
              <label>
                <span>回访日期</span>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                />
              </label>
              <label>
                <span>设备序列号</span>
                <input
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  placeholder="如 HA-2026-0001"
                />
              </label>
              <label>
                <span>备注</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="充电盒掉电情况、使用场景等"
                />
              </label>
            </div>
            <EarReadingFieldset ear="left" value={leftForm} onChange={setLeftForm} />
            <EarReadingFieldset ear="right" value={rightForm} onChange={setRightForm} />
            {formError && <p className="form-error">{formError}</p>}
            <button type="submit" className="primary-action">
              保存回访记录
            </button>
          </form>
        </section>

        <aside className="panel narrow">
          <h2>待检列表（{openPending.length}）</h2>
          {openPending.length === 0 && <p className="empty-hint">当前没有待检的耳。</p>}
          <div className="pending-list">
            {openPending.map((item) => (
              <article key={item.id} className="pending-card">
                <div className="pending-head">
                  <strong>
                    {item.patientName} · {EAR_LABELS[item.ear]}
                  </strong>
                  <span className="badge badge-pending">待检</span>
                </div>
                <p className="serial-line">序列号 {item.deviceSerial}</p>
                <ul className="reason-list">
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <ReadingSummary reading={item.reading} />
                <label>
                  <span>检测结论</span>
                  <input
                    value={conclusions[item.id] ?? ""}
                    onChange={(e) =>
                      setConclusions((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="结论回来后填写"
                  />
                </label>
                <button
                  className="primary-action"
                  onClick={() => handleResolve(item)}
                  disabled={!(conclusions[item.id] ?? "").trim()}
                >
                  登记结论并结案
                </button>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="workspace">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p>调机</p>
              <h2>新建调机</h2>
            </div>
          </div>
          <form onSubmit={handleAddTuning} className="stacked-form">
            <div className="field-grid">
              <label>
                <span>用户姓名</span>
                <input
                  value={tuningPatient}
                  onChange={(e) => setTuningPatient(e.target.value)}
                  placeholder="与回访记录一致"
                />
              </label>
              <label>
                <span>耳别</span>
                <select
                  value={tuningEar}
                  onChange={(e) => setTuningEar(e.target.value as EarSide)}
                >
                  {EAR_ORDER.map((ear) => (
                    <option key={ear} value={ear}>
                      {EAR_LABELS[ear]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>设备序列号</span>
                <input
                  value={tuningSerial}
                  onChange={(e) => setTuningSerial(e.target.value)}
                  placeholder="选填"
                />
              </label>
              <label>
                <span>调机内容</span>
                <input
                  value={tuningDetail}
                  onChange={(e) => setTuningDetail(e.target.value)}
                  placeholder="如 2kHz 增益提高 4dB"
                />
              </label>
            </div>
            {tuningBlock && (
              <p className="form-error">
                {tuningBlock.patientName} 的{EAR_LABELS[tuningBlock.ear]}
                仍在待检中（{tuningBlock.reasons.join("；")}），检测结论回来前不能新建调机。
              </p>
            )}
            {tuningError && <p className="form-error">{tuningError}</p>}
            <button type="submit" className="primary-action" disabled={Boolean(tuningBlock)}>
              保存调机记录
            </button>
          </form>
          <div className="record-list compact">
            {state.tunings.map((tuning) => (
              <article key={tuning.id} className="record-card">
                <div>
                  <h3>
                    {tuning.patientName} · {EAR_LABELS[tuning.ear]}
                  </h3>
                  <p>
                    {tuning.detail}
                    {tuning.deviceSerial && ` · 序列号 ${tuning.deviceSerial}`} ·{" "}
                    {formatTime(tuning.createdAt)}
                  </p>
                </div>
              </article>
            ))}
            {state.tunings.length === 0 && <p className="empty-hint">还没有调机记录。</p>}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>寄回 / 换机</p>
              <h2>登记新旧序列号</h2>
            </div>
          </div>
          <form onSubmit={handleAddExchange} className="stacked-form">
            <div className="field-grid">
              <label>
                <span>用户姓名</span>
                <input
                  value={exchangePatient}
                  onChange={(e) => setExchangePatient(e.target.value)}
                />
              </label>
              <label>
                <span>耳别</span>
                <select
                  value={exchangeEar}
                  onChange={(e) => setExchangeEar(e.target.value as EarSide)}
                >
                  {EAR_ORDER.map((ear) => (
                    <option key={ear} value={ear}>
                      {EAR_LABELS[ear]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>处理方式</span>
                <select
                  value={exchangeKind}
                  onChange={(e) => setExchangeKind(e.target.value as ExchangeKind)}
                >
                  {(Object.keys(EXCHANGE_LABELS) as ExchangeKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {EXCHANGE_LABELS[kind]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>旧序列号</span>
                <input
                  value={oldSerial}
                  onChange={(e) => setOldSerial(e.target.value)}
                  placeholder="寄回 / 换下的设备"
                />
              </label>
              <label>
                <span>新序列号</span>
                <input
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="新配发的设备"
                />
              </label>
              <label>
                <span>备注</span>
                <input
                  value={exchangeNote}
                  onChange={(e) => setExchangeNote(e.target.value)}
                  placeholder="选填"
                />
              </label>
            </div>
            {exchangeError && <p className="form-error">{exchangeError}</p>}
            <button type="submit" className="primary-action">
              保存{EXCHANGE_LABELS[exchangeKind]}记录
            </button>
          </form>
          <div className="record-list compact">
            {state.exchanges.map((exchange) => (
              <article key={exchange.id} className="record-card">
                <div>
                  <h3>
                    {exchange.patientName} · {EAR_LABELS[exchange.ear]} ·{" "}
                    {EXCHANGE_LABELS[exchange.kind]}
                  </h3>
                  <p>
                    {exchange.oldSerial} → {exchange.newSerial} · {exchange.date}
                    {exchange.note && ` · ${exchange.note}`}
                  </p>
                </div>
              </article>
            ))}
            {state.exchanges.length === 0 && <p className="empty-hint">还没有寄回或换机记录。</p>}
          </div>
        </section>
      </section>

      <section className="panel records">
        <div className="section-heading">
          <div>
            <p>设备经历</p>
            <h2>按序列号查询</h2>
          </div>
          <input
            className="serial-search"
            value={serialQuery}
            onChange={(e) => setSerialQuery(e.target.value)}
            placeholder="输入序列号，旧设备经历也能查"
          />
        </div>
        {serialHistory && (
          <div className="history-grid">
            <div>
              <h3>回访（{serialHistory.followUps.length}）</h3>
              {serialHistory.followUps.map((record) => (
                <p key={record.id} className="history-line">
                  {record.visitDate} · {record.patientName} · 左耳续航 {record.left.runtimeHours}h /
                  右耳续航 {record.right.runtimeHours}h
                </p>
              ))}
            </div>
            <div>
              <h3>待检（{serialHistory.inspections.length}）</h3>
              {serialHistory.inspections.map((item) => (
                <p key={item.id} className="history-line">
                  {EAR_LABELS[item.ear]} · {item.reasons.join("；")} ·{" "}
                  {item.status === "pending" ? "待检中" : `已结案：${item.conclusion}`}
                </p>
              ))}
            </div>
            <div>
              <h3>调机（{serialHistory.tunings.length}）</h3>
              {serialHistory.tunings.map((tuning) => (
                <p key={tuning.id} className="history-line">
                  {EAR_LABELS[tuning.ear]} · {tuning.detail} · {formatTime(tuning.createdAt)}
                </p>
              ))}
            </div>
            <div>
              <h3>寄回 / 换机（{serialHistory.exchanges.length}）</h3>
              {serialHistory.exchanges.map((exchange) => (
                <p key={exchange.id} className="history-line">
                  {EXCHANGE_LABELS[exchange.kind]} · {exchange.oldSerial} → {exchange.newSerial} ·{" "}
                  {exchange.date}
                </p>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>全部回访</p>
            <h2>回访记录（{state.followUps.length}）</h2>
          </div>
        </div>
        <div className="record-list">
          {state.followUps.map((record) => {
            const flags = pendingByRecord.get(record.id) ?? [];
            return (
              <article key={record.id} className="record-card followup-card">
                <div className="followup-head">
                  <h3>
                    {record.patientName} · {record.visitDate}
                  </h3>
                  <span className="serial-line">序列号 {record.deviceSerial}</span>
                </div>
                <div className="ear-summary-grid">
                  {EAR_ORDER.map((ear) => {
                    const flag = flags.find((item) => item.ear === ear);
                    return (
                      <div
                        key={ear}
                        className={flag ? "ear-summary flagged" : "ear-summary"}
                      >
                        <strong>
                          {EAR_LABELS[ear]}
                          {flag && (
                            <span
                              className={
                                flag.status === "pending" ? "badge badge-pending" : "badge badge-done"
                              }
                            >
                              {flag.status === "pending" ? "待检" : "已结案"}
                            </span>
                          )}
                        </strong>
                        <ReadingSummary reading={record[ear]} />
                        {flag && (
                          <p className="reason-line">
                            {flag.reasons.join("；")}
                            {flag.status === "resolved" && ` · 结论：${flag.conclusion}`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {record.note && <p className="note-line">备注：{record.note}</p>}
              </article>
            );
          })}
          {state.followUps.length === 0 && (
            <p className="empty-hint">还没有回访记录，从上方「新增回访记录」开始。</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
