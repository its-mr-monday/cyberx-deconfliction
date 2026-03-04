import { useState } from 'react';
import api from '../api/client';

export default function TicketForm({ onSubmitted }) {
  const [form, setForm] = useState({
    incident_datetime: new Date().toISOString().slice(0, 16),
    description: '',
    source_ips: '',
    affected_hosts: '',
    actions_taken: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        ...form,
        incident_datetime: new Date(form.incident_datetime).toISOString(),
        source_ips: form.source_ips.split('\n').map(s => s.trim()).filter(Boolean),
        affected_hosts: form.affected_hosts.split('\n').map(s => s.trim()).filter(Boolean),
      };

      const res = await api.post('/api/tickets', payload);
      setMessage({ type: 'success', text: `Report submitted — Case ${res.data.case_number}` });
      setForm({
        incident_datetime: new Date().toISOString().slice(0, 16),
        description: '',
        source_ips: '',
        affected_hosts: '',
        actions_taken: '',
      });
      onSubmitted?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit report.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-form">
      <h2>Submit Deconfliction Report</h2>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="form-group">
        <label>Date/Time of Incident</label>
        <div className="datetime-row">
          <input
            type="datetime-local"
            name="incident_datetime"
            value={form.incident_datetime}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            className="btn btn-outline btn-now"
            onClick={() => setForm({ ...form, incident_datetime: new Date().toISOString().slice(0, 16) })}
          >
            Now
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          placeholder="Describe the suspicious activity..."
          required
        />
      </div>

      <div className="form-group">
        <label>Source IPs / Domains (one per line)</label>
        <textarea
          name="source_ips"
          value={form.source_ips}
          onChange={handleChange}
          rows={3}
          placeholder="192.168.1.50&#10;evil.example.com"
          required
        />
      </div>

      <div className="form-group">
        <label>Affected Hosts (one per line)</label>
        <textarea
          name="affected_hosts"
          value={form.affected_hosts}
          onChange={handleChange}
          rows={3}
          placeholder="10.0.0.25&#10;DC01.lab.local"
          required
        />
      </div>

      <div className="form-group">
        <label>Actions Taken</label>
        <textarea
          name="actions_taken"
          value={form.actions_taken}
          onChange={handleChange}
          rows={3}
          placeholder="Blocked traffic, isolated host, etc."
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
}
