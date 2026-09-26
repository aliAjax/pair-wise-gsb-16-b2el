import { EAR_LABEL, EAR_ORDER, FollowUpRecord } from "../domain/types";

interface Props {
  records: FollowUpRecord[];
}

export function RecordList({ records }: Props) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>台账</p>
          <h2>回访记录（{records.length}）</h2>
        </div>
      </div>
      <div className="stack-list">
        {records.length === 0 && <p className="empty">还没有回访记录。</p>}
        {records.map((record) => (
          <article key={record.id} className="record-card">
            <header className="record-head">
              <strong>
                {record.userId} {record.userName}
              </strong>
              <span className="meta">回访日期 {record.visitDate}</span>
            </header>
            <div className="ear-grid">
              {EAR_ORDER.map((side) => {
                const ear = record.ears.find((e) => e.side === side);
                if (!ear) return null;
                const flag = record.flags.find((f) => f.side === side);
                return (
                  <div key={side} className={`ear-summary ${flag ? "is-flagged" : ""}`}>
                    <strong>
                      {EAR_LABEL[side]}
                      {flag && <span className="tag tag-warn">待检</span>}
                    </strong>
                    <p>
                      充电前 {ear.batteryBefore}% → 充电后 {ear.batteryAfter}% · 续航 {ear.enduranceHours} 小时 ·
                      断连 {ear.disconnects} 次
                    </p>
                    {flag && (
                      <ul className="reason-list">
                        {flag.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {record.note && <p className="meta">备注：{record.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
