import { useState, useEffect, useCallback } from 'react';
import TicketTable from '../components/TicketTable';
import TicketDetail from '../components/TicketDetail';
import api from '../api/client';

export default function WhiteDashboard() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState({ total: 0, hits: 0, misses: 0, pending: 0, hit_rate: 0 });
  const [tab, setTab] = useState('tickets');

  const loadTickets = useCallback(async () => {
    try {
      const res = await api.get('/api/tickets', { params: { date } });
      setTickets(res.data);
    } catch {
      // silently fail
    }
  }, [date]);

  const loadUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch {
      // silently fail
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => { loadTickets(); loadStats(); }, [loadTickets]);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab]);

  const handleDeleteUser = async (userId) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      loadUsers();
    } catch {
      alert('Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch {
      alert('Failed to update role');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>White Cell Dashboard</h1>
      </div>

      <div className="stats-bar">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">All Time Total</span>
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
        <div className="stat-card">
          <span className="stat-number">{stats.hit_rate}%</span>
          <span className="stat-label">Hit Rate</span>
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${tab === 'tickets' ? 'active' : ''}`}
          onClick={() => setTab('tickets')}
        >
          Tickets
        </button>
        <button
          className={`tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
      </div>

      {tab === 'tickets' && (
        <section>
          <div className="date-filter">
            <label>Date: </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <TicketTable tickets={tickets} onSelect={setSelected} />
        </section>
      )}

      {tab === 'users' && (
        <section className="user-management">
          <div className="table-wrapper">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="blue">Blue</option>
                        <option value="red">Red</option>
                        <option value="white">White</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { loadTickets(); loadStats(); setSelected(null); }}
        />
      )}
    </div>
  );
}
