import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import LangSwitch from '../../components/LangSwitch';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/admin', end: true, label: t('admin.dashboard') },
    { to: '/admin/establishments', label: t('admin.establishments') },
  ];

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">E-CAFE</div>
          <div className="sidebar-user">{user?.name}</div>
        </div>
        <nav className="sidebar-nav-wrap">
          <ul className="sidebar-nav">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <LangSwitch />
          <button className="btn btn-secondary btn-sm btn-block sidebar-logout" onClick={handleLogout}>
            {t('auth.logout')}
          </button>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
