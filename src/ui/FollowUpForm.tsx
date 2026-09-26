import { FormEvent, useState } from "react";
import { EAR_LABEL, EAR_ORDER, EarFlag, EarReading, EarSide } from "../domain/types";
import { UserRef } from "../domain/rules";
import { today } from "../utils";

export interface FollowUpInput {
  userId: string;
  userName: string;
  visitDate: string;
  note: string;
  ears: EarReading[];
}

interface EarDraft {
  batteryBefore: string;
  batteryAfter: string;
  enduranceHours: string;
  disconnects: string;
}

const emptyEar = (): EarDraft => ({
  batteryBefore: "",
  batteryAfter: "",
  enduranceHours: "",
  disconnects: "",
});

const EAR_FIELDS: { key: keyof EarDraft; label: string; hint: string }[] = [
  { key: "batteryBefore", label: "充电前电量 %", hint: "0–100" },
  { key: "batteryAfter", label: "充电后电量 %", hint: "0–100" },
  { key: "enduranceHours", label: "续航（小时）", hint: "如 9.5" },
  { key: "disconnects", label: "当天断连次数", hint: "如 2" },
];

interface Props {
  knownUsers: UserRef[];
  onSubmit: (input: FollowUpInput) => EarFlag[];
}

export function FollowUpForm({ knownUsers, onSubmit }: Props) {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [visitDate, setVisitDate] = useState(today());
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Record<EarSide, EarDraft>>({
    left: emptyEar(),
    right: emptyEar(),
  });
  const [error, setError] = useState("");
  const [result, setResult] = useState<EarFlag[] | null>(null);

  const handleUserId = (value: string) => {
    setUserId(value);
    const known = knownUsers.find((u) => u.userId === value.trim());
    if (known) setUserName(known.userName);
  };

  const setEarField = (side: EarSide, key: keyof EarDraft, value: string) => {
    setDrafts((prev) => ({ ...prev, [side]: { ...prev[side], [key]: value } }));
  };

  const parseEar = (side: EarSide): EarReading | string => {
    const d = drafts[side];
    const batteryBefore = Number(d.batteryBefore);
    const batteryAfter = Number(d.batteryAfter);
    const enduranceHours = Number(d.enduranceHours);
    const disconnects = Number(d.disconnects);
    if ([d.batteryBefore, d.batteryAfter, d.enduranceHours, d.disconnects].some((v) => v.trim() === "")) {
      return `${EAR_LABEL[side]}四项都要填写`;
    }
    if ([batteryBefore, batteryAfter].some((v) => Number.isNaN(v) || v < 0 || v > 100)) {
      return `${EAR_LABEL[side]}电量需在 0–100 之间`;
    }
    if (Number.isNaN(enduranceHours) || enduranceHours < 0 || enduranceHours > 24) {
      return `${EAR_LABEL[side]}续航需在 0–24 小时之间`;
    }
    if (Number.isNaN(disconnects) || disconnects < 0 || !Number.isInteger(disconnects)) {
      return `${EAR_LABEL[side]}断连次数需为不小于 0 的整数`;
    }
    return { side, batteryBefore, batteryAfter, enduranceHours, disconnects };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!userId.trim()) {
      setError("请填写用户编号");
      return;
    }
    const ears: EarReading[] = [];
    for (const side of EAR_ORDER) {
      const parsed = parseEar(side);
      if (typeof parsed === "string") {
        setError(parsed);
        return;
      }
      ears.push(parsed);
    }
    setError("");
    const flags = onSubmit({
      userId: userId.trim(),
      userName: userName.trim(),
      visitDate,
      note: note.trim(),
      ears,
    });
    setResult(flags);
    setDrafts({ left: emptyEar(), right: emptyEar() });
    setNote("");
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>回访登记</p>
          <h2>新增回访记录（按耳登记）</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            <span>用户编号 *</span>
            <input
              list="known-users"
              value={userId}
              onChange={(e) => handleUserId(e.target.value)}
              placeholder="如 Wang-031"
            />
          </label>
          <label>
            <span>姓名</span>
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="选老用户自动带出" />
          </label>
          <label>
            <span>回访日期</span>
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </label>
        </div>

        <div className="ear-grid">
          {EAR_ORDER.map((side) => (
            <fieldset key={side} className="ear-card">
              <legend>{EAR_LABEL[side]}</legend>
              <div className="ear-fields">
                {EAR_FIELDS.map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={drafts[side][field.key]}
                      onChange={(e) => setEarField(side, field.key, e.target.value)}
                      placeholder={field.hint}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <label>
          <span>备注</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="充电盒掉电、单耳断连等主诉" />
        </label>

        {error && <p className="form-error">{error}</p>}
        {result && (
          <p className={result.length ? "form-warn" : "form-ok"}>
            {result.length
              ? `已登记，${result
                  .map((f) => `${EAR_LABEL[f.side]}进入待检（${f.reasons.join("；")}）`)
                  .join("；")}，原输入已保留。`
              : "已登记，本次未触发待检。"}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="primary-action">
            保存回访记录
          </button>
        </div>
      </form>
    </section>
  );
}
