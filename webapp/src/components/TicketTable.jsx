function StatusBadge({ isHit }) {
  if (isHit === null || isHit === undefined) {
    return <span className="status-badge status-pending">Pending</span>;
  }
  return isHit
    ? <span className="status-badge status-hit">Hit</span>
    : <span className="status-badge status-miss">Miss</span>;
}

export default function TicketTable({ tickets, onSelect, hideStatus }) {
  if (!tickets.length) {
    return <p className="empty-state">No tickets found.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Case #</th>
            <th>Time</th>
            <th>Submitted By</th>
            <th>Description</th>
            <th>Source IPs</th>
            {!hideStatus && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} onClick={() => onSelect?.(t)} className="clickable">
              <td><code>{t.case_number}</code></td>
              <td>{new Date(t.incident_datetime).toLocaleString()}</td>
              <td>{t.submitted_by?.name}</td>
              <td className="desc-cell">{t.description.length > 80 ? t.description.slice(0, 80) + '...' : t.description}</td>
              <td className="ip-cell">{t.source_ips?.join(', ')}</td>
              {!hideStatus && <td><StatusBadge isHit={t.is_hit} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
