import { FormEvent, useState } from "react";
import { EAR_LABEL, EAR_ORDER, EarSide, PendingInspection, TuningRecord } from "../domain/types";
import { UserRef } from "../domain/rules";
import { formatDateTime } from "../utils";

export interface TuningInput {
  userId: string;
  side: EarSide;
  detail: string;
}

interface Props {
  knownUsers: UserRef[];
  tunings: TuningRecord[];
  blocker: (userId: string, side: EarSide) => PendingInspection | undefined;
  onAdd: (input: TuningInput) => string | null;
}

export function TuningPanel({ knownUsers, tunings, blocker, onAdd }: Props) {
  const [userId, setUserId] = useState("");
  const [side, setSide] = useState<EarSide>("left");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");

  const blocking = userId.trim() ? blocker(userId.trim(), side) : undefined;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError("请填写用户编号");
      return;
    }
    if (!detail.trim()) {
      setError("请填写调机内容");
      return;
    }
    const message = onAdd({ userId: userId.trim(), side, detail: detail.trim() });
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setDetail("");
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>调机</p>
          <h2>新建调机</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            <span>用户编号 *</span>
            <input
              list="known-users"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="如 Liu-024"
            />
          </label>
          <label>
            <span>耳侧</span>
            <select value={side} onChange={(e) => setSide(e.target.value as EarSide)}>
              {EAR_ORDER.map((s) => (
                <option key={s} value={s}>
                  {EAR_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>调机内容 *</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="增益、程序、耳塞等调整"
            rows={2}
          />
        </label>
        {blocking && (
          <p className="form-warn">
            {EAR_LABEL[side]}有待检未出结论（{blocking.reasons.join("；")}），检测结论回来前不能新建调机。
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary-action" disabled={Boolean(blocking)}>
            保存调机记录
          </button>
        </div>
      </form>

      <h3 className="sub-heading">调机记录（{tunings.length}）</h3>
      <div className="stack-list">
        {tunings.length === 0 && <p className="empty">还没有调机记录。</p>}
        {tunings.map((t) => (
          <article key={t.id} className="simple-card">
            <strong>
              {t.userId} {t.userName} · {EAR_LABEL[t.side]}
            </strong>
            <p>{t.detail}</p>
            <p className="meta">{formatDateTime(t.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
