import { FormEvent, useState } from "react";
import {
  EAR_LABEL,
  EAR_ORDER,
  EXCHANGE_LABEL,
  EarSide,
  ExchangeKind,
  DeviceExchange,
} from "../domain/types";
import { UserRef, deviceHistory } from "../domain/rules";
import { formatDateTime } from "../utils";

export interface ExchangeInput {
  userId: string;
  side: EarSide;
  kind: ExchangeKind;
  oldSerial: string;
  newSerial: string;
  note: string;
}

interface Props {
  knownUsers: UserRef[];
  exchanges: DeviceExchange[];
  onAdd: (input: ExchangeInput) => string | null;
}

export function ExchangePanel({ knownUsers, exchanges, onAdd }: Props) {
  const [userId, setUserId] = useState("");
  const [side, setSide] = useState<EarSide>("left");
  const [kind, setKind] = useState<ExchangeKind>("replace");
  const [oldSerial, setOldSerial] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = onAdd({
      userId: userId.trim(),
      side,
      kind,
      oldSerial: oldSerial.trim(),
      newSerial: newSerial.trim(),
      note: note.trim(),
    });
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setOldSerial("");
    setNewSerial("");
    setNote("");
  };

  const history = deviceHistory(exchanges, searched);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>寄回 / 换机</p>
          <h2>设备登记与经历查询</h2>
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
              placeholder="如 Chen-118"
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
          <label>
            <span>类型</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as ExchangeKind)}>
              {(Object.keys(EXCHANGE_LABEL) as ExchangeKind[]).map((k) => (
                <option key={k} value={k}>
                  {EXCHANGE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>旧序列号 *</span>
            <input value={oldSerial} onChange={(e) => setOldSerial(e.target.value)} placeholder="如 HA-R-77102" />
          </label>
          <label>
            <span>新序列号{kind === "replace" ? " *" : "（寄回未补机可留空）"}</span>
            <input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="如 HA-R-80445" />
          </label>
        </div>
        <label>
          <span>备注</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="寄回原因、换机缘由" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="primary-action">
            保存登记
          </button>
        </div>
      </form>

      <h3 className="sub-heading">登记记录（{exchanges.length}）</h3>
      <div className="stack-list">
        {exchanges.length === 0 && <p className="empty">还没有寄回或换机登记。</p>}
        {exchanges.map((ex) => (
          <article key={ex.id} className="simple-card">
            <strong>
              {ex.userId} {ex.userName} · {EAR_LABEL[ex.side]} · {EXCHANGE_LABEL[ex.kind]}
            </strong>
            <p>
              旧序列号 {ex.oldSerial}
              {ex.newSerial ? ` → 新序列号 ${ex.newSerial}` : "（未补新机）"}
              {ex.note ? ` · ${ex.note}` : ""}
            </p>
            <p className="meta">{formatDateTime(ex.createdAt)}</p>
          </article>
        ))}
      </div>

      <h3 className="sub-heading">旧设备经历查询</h3>
      <form
        className="lookup-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(query.trim());
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入序列号，如 HA-R-77102"
        />
        <button type="submit">查询</button>
      </form>
      {searched && (
        <div className="stack-list">
          {history.length === 0 && <p className="empty">没有查到序列号 {searched} 的经历。</p>}
          {history.map((ev, i) => (
            <article key={`${ev.at}-${i}`} className="simple-card">
              <strong>
                {formatDateTime(ev.at)} ·{" "}
                {ev.role === "installed"
                  ? `装机给 ${ev.userId} ${ev.userName}（${EAR_LABEL[ev.side]}），换下 ${ev.counterpart}`
                  : ev.kind === "return"
                    ? `${ev.userId} ${ev.userName}（${EAR_LABEL[ev.side]}）寄回`
                    : `${ev.userId} ${ev.userName}（${EAR_LABEL[ev.side]}）被换下${
                        ev.counterpart ? `，新机 ${ev.counterpart}` : ""
                      }`}
              </strong>
              {ev.note && <p>{ev.note}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
