import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_COLORS = {
  blue: '#3b82f6',
  red: '#ef4444',
  white: '#a855f7',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">CyberX Deconfliction</div>
      <div className="navbar-user">
        <span className="role-badge" style={{ backgroundColor: ROLE_COLORS[user.role] }}>
          {user.role.toUpperCase()}
        </span>
        <span className="user-name">{user.name}</span>
        <button onClick={handleLogout} className="btn btn-sm btn-outline">Logout</button>
      </div>
    </nav>
  );
}
