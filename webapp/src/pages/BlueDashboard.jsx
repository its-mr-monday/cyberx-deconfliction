import { useState, useEffect, useCallback } from 'react';
import TicketForm from '../components/TicketForm';
import TicketTable from '../components/TicketTable';
import TicketDetail from '../components/TicketDetail';
import api from '../api/client';

export default function BlueDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadTickets = useCallback(async () => {
    try {
      const res = await api.get('/api/tickets/my');
      setTickets(res.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  return (
    <div className="dashboard">
      <TicketForm onSubmitted={loadTickets} />

      <section className="my-tickets">
        <h2>My Submitted Reports</h2>
        <TicketTable tickets={tickets} onSelect={setSelected} hideStatus />
      </section>

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
