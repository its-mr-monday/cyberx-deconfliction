import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const ROLE_HOME = {
  blue: '/blue',
  red: '/red',
  white: '/admin',
};

const ROLE_LABELS = {
  blue: 'Blue Team',
  red: 'Red Team',
  white: 'White Cell',
};

export default function RegisterPage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/api/auth/invite/${token}`)
      .then((res) => setInvite(res.data))
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }
    try {
      const user = await register(form.name, form.email, form.password, token);
      navigate(ROLE_HOME[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="loading">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>CyberX Deconfliction</h1>
          <h2>Invalid Invite</h2>
          <p className="empty-state">This invite link is invalid or has already been used.</p>
          <p className="auth-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>CyberX Deconfliction</h1>
        <h2>Register</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={`invite-role-banner invite-role-${invite.role}`}>
          You have been invited as <strong>{ROLE_LABELS[invite.role] || invite.role}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@cyberx.local"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
