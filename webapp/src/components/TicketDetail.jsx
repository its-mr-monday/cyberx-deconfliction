import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TicketDetail({ ticket, onClose, onUpdated }) {
  const { user } = useAuth();
  const [isHit, setIsHit] = useState(ticket.is_hit);
  const [comment, setComment] = useState(ticket.red_team_comment || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isBlue = user?.role === 'blue';
  const canReview = user?.role === 'red';

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/api/tickets/${ticket.id}/review`, {
        is_hit: isHit,
        comment,
      });
      setMessage({ type: 'success', text: 'Review saved.' });
      onUpdated?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save review.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{ticket.case_number}</h2>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <div className="detail-grid">
          <div className="detail-field">
            <label>Submitted By</label>
            <p>{ticket.submitted_by?.name}</p>
          </div>
          <div className="detail-field">
            <label>Incident Date/Time</label>
            <p>{new Date(ticket.incident_datetime).toLocaleString()}</p>
          </div>
          <div className="detail-field full-width">
            <label>Description</label>
            <p>{ticket.description}</p>
          </div>
          <div className="detail-field">
            <label>Source IPs / Domains</label>
            <ul className="ip-list">
              {ticket.source_ips?.map((ip, i) => <li key={i}><code>{ip}</code></li>)}
            </ul>
          </div>
          <div className="detail-field">
            <label>Affected Hosts</label>
            <ul className="ip-list">
              {ticket.affected_hosts?.map((h, i) => <li key={i}><code>{h}</code></li>)}
            </ul>
          </div>
          <div className="detail-field full-width">
            <label>Actions Taken</label>
            <p>{ticket.actions_taken}</p>
          </div>
        </div>

        {!isBlue && (
          <>
            <hr />

            <h3>Red Team Review</h3>

            {canReview ? (
              <div className="review-form">
                <div className="hit-miss-toggle">
                  <button
                    className={`btn ${isHit === true ? 'btn-hit active' : 'btn-outline'}`}
                    onClick={() => setIsHit(true)}
                    type="button"
                  >
                    Hit
                  </button>
                  <button
                    className={`btn ${isHit === false ? 'btn-miss active' : 'btn-outline'}`}
                    onClick={() => setIsHit(false)}
                    type="button"
                  >
                    Miss
                  </button>
                </div>

                <div className="form-group">
                  <label>Comments</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Add review comments..."
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  disabled={saving || isHit === null || isHit === undefined}
                >
                  {saving ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            ) : (
              <div className="review-readonly">
                {ticket.is_hit === null || ticket.is_hit === undefined ? (
                  <p className="status-pending-text">Awaiting Red Team review</p>
                ) : (
                  <>
                    <p>
                      <strong>Verdict:</strong>{' '}
                      <span className={ticket.is_hit ? 'text-hit' : 'text-miss'}>
                        {ticket.is_hit ? 'HIT' : 'MISS'}
                      </span>
                    </p>
                    {ticket.red_team_comment && (
                      <p><strong>Comment:</strong> {ticket.red_team_comment}</p>
                    )}
                    {ticket.reviewed_by && (
                      <p className="reviewed-meta">
                        Reviewed by {ticket.reviewed_by.name} at{' '}
                        {new Date(ticket.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
