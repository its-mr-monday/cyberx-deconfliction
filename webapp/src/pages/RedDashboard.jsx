import { useState, useEffect, useCallback } from 'react';
import TicketTable from '../components/TicketTable';
import TicketDetail from '../components/TicketDetail';
import api from '../api/client';

export default function RedDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const loadTickets = useCallback(async () => {
    try {
      const res = await api.get('/api/tickets', { params: { date } });
      setTickets(res.data);
    } catch {
      // silently fail
    }
  }, [date]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const stats = {
    total: tickets.length,
    hits: tickets.filter(t => t.is_hit === true).length,
    misses: tickets.filter(t => t.is_hit === false).length,
    pending: tickets.filter(t => t.is_hit === null || t.is_hit === undefined).length,
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Red Team Dashboard</h1>
        <div className="date-filter">
          <label>Date: </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card stat-hit">
          <span className="stat-number">{stats.hits}</span>
          <span className="stat-label">Hits</span>
        </div>
        <div className="stat-card stat-miss">
          <span className="stat-number">{stats.misses}</span>
          <span className="stat-label">Misses</span>
        </div>
        <div className="stat-card stat-pending">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
      </div>

      <TicketTable tickets={tickets} onSelect={setSelected} />

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { loadTickets(); setSelected(null); }}
        />
      )}
    </div>
  );
}
