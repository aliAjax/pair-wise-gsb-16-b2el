import { useState } from "react";
import { EAR_LABEL, PendingInspection } from "../domain/types";
import { formatDateTime } from "../utils";

interface Props {
  pending: PendingInspection[];
  onResolve: (id: string, conclusion: string) => void;
}

function SourceSnapshot({ item }: { item: PendingInspection }) {
  const s = item.source;
  return (
    <p className="snapshot">
      原输入：充电前 {s.batteryBefore}% → 充电后 {s.batteryAfter}% · 续航 {s.enduranceHours} 小时 · 断连{" "}
      {s.disconnects} 次
    </p>
  );
}

function PendingCard({ item, onResolve }: { item: PendingInspection; onResolve: Props["onResolve"] }) {
  const [conclusion, setConclusion] = useState("");
  const done = item.status === "resolved";

  return (
    <article className={`pending-card ${done ? "is-resolved" : ""}`}>
      <header>
        <strong>
          {item.userId} {item.userName} · {EAR_LABEL[item.side]}
        </strong>
        <span className={done ? "tag tag-ok" : "tag tag-warn"}>{done ? "已出结论" : "待检中"}</span>
      </header>
      <ul className="reason-list">
        {item.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <SourceSnapshot item={item} />
      <p className="meta">登记于 {formatDateTime(item.createdAt)}</p>
      {done ? (
        <p className="conclusion">
          检测结论（{item.resolvedAt ? formatDateTime(item.resolvedAt) : "-"}）：{item.conclusion}
        </p>
      ) : (
        <div className="resolve-box">
          <textarea
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="填写检测结论，填写前该耳不能新建调机"
            rows={2}
          />
          <button
            type="button"
            className="primary-action"
            disabled={!conclusion.trim()}
            onClick={() => onResolve(item.id, conclusion.trim())}
          >
            登记检测结论
          </button>
        </div>
      )}
    </article>
  );
}

export function PendingBoard({ pending, onResolve }: Props) {
  const open = pending.filter((p) => p.status === "pending");
  const done = pending.filter((p) => p.status === "resolved");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>待检</p>
          <h2>待检耳（{open.length} 项未出结论）</h2>
        </div>
      </div>
      <div className="stack-list">
        {open.length === 0 && <p className="empty">当前没有待检的耳。</p>}
        {open.map((item) => (
          <PendingCard key={item.id} item={item} onResolve={onResolve} />
        ))}
      </div>
      {done.length > 0 && (
        <>
          <h3 className="sub-heading">已出结论</h3>
          <div className="stack-list">
            {done.map((item) => (
              <PendingCard key={item.id} item={item} onResolve={onResolve} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
