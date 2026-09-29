import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Building2,
  LayoutDashboard,
  Users,
  House,
  UserRound,
  CalendarDays,
  ListTodo,
  ChartNoAxesCombined,
  Settings,
  Bell,
  Search,
  PanelLeftClose,
  Menu,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import {
  selectUser,
  selectWorkspace,
  sessionChanged,
  sidebarToggled,
  selectDueAlerts,
} from '../store';
import { authService } from '../../../services/authService';
import { isAdmin, label, dateTime } from '../constants';
import { Button, Dialog, EmptyState, useCommand } from './UI';
import '../crm.css';
const adminNav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['leads', 'Leads', Users],
  ['properties', 'Properties', House],
  ['agents', 'Agents', UserRound],
  ['viewings', 'Viewings', CalendarDays],
  ['tasks', 'Tasks', ListTodo],
  ['reports', 'Reports', ChartNoAxesCombined],
  ['settings', 'Settings', Settings],
];
const agentNav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['leads', 'My Leads', Users],
  ['tasks', 'Tasks', ListTodo],
  ['viewings', 'Viewings', CalendarDays],
  ['calendar', 'Calendar', CalendarDays],
  ['profile', 'Profile', UserRound],
];
function Sidebar({ admin, base, onNavigate, collapsed }) {
  return (
    <>
      <Link className="crm-brand" to={`${base}/dashboard`} onClick={onNavigate}>
        <Building2 size={28} />
        {!collapsed && (
          <span>
            DUBAI HOUSE<small>{admin ? 'ADMIN WORKSPACE' : 'AGENT WORKSPACE'}</small>
          </span>
        )}
      </Link>
      <p className="crm-nav-caption">{collapsed ? 'CRM' : 'WORKSPACE'}</p>
      <nav aria-label="CRM navigation">
        {(admin ? adminNav : agentNav).map(([path, title, Icon]) => (
          <NavLink key={path} to={`${base}/${path}`} onClick={onNavigate} title={title}>
            <Icon size={19} />
            {!collapsed && <span>{title}</span>}
          </NavLink>
        ))}
      </nav>
      <Link className="crm-public-link" to="/">
        {collapsed ? <House size={20} /> : '↗ Visit public website'}
      </Link>
    </>
  );
}
export function CRMLayout({ admin = false }) {
  const user = useSelector(selectUser);
  const data = useSelector(selectWorkspace);
  const collapsed = useSelector((s) => s.crmUi.collapsed);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const run = useCommand();
  const [drawer, setDrawer] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [query, setQuery] = useState('');
  const [userMenu, setUserMenu] = useState(false);
  const [error, setError] = useState('');
  const base = admin ? '/admin' : '/agent';
  useEffect(() => {
    setQuery('');
    setUserMenu(false);
    document.title = `${label(location.pathname.split('/').filter(Boolean).at(-1))} | Dubai House CRM`;
  }, [location.pathname]);
  const needle = query.toLowerCase().trim();
  const matches = needle
    ? [
        ...data.leads
          .filter((l) =>
            `${l.id} ${Object.values(l.customer).join(' ')} ${data.properties.find((p) => p.id === l.propertyId)?.title || ''}`
              .toLowerCase()
              .includes(needle),
          )
          .map((l) => ({
            id: l.id,
            title: l.customer.name,
            subtitle: `Lead · ${l.customer.email}`,
            to: `${base}/leads/${l.id}`,
          })),
        ...(admin
          ? data.properties
              .filter((p) => `${p.title} ${p.location}`.toLowerCase().includes(needle))
              .map((p) => ({
                id: `p${p.id}`,
                title: p.title,
                subtitle: 'Property',
                to: `/admin/properties?property=${p.id}`,
              }))
          : []),
        ...data.agents
          .filter((a) => `${a.name} ${a.email}`.toLowerCase().includes(needle))
          .map((a) => ({
            id: a.id,
            title: a.name,
            subtitle: 'Agent',
            to: admin ? `/admin/agents/${a.id}` : '/agent/profile',
          })),
      ].slice(0, 10)
    : [];
  const due = selectDueAlerts(data, user);
  const notices = [...due, ...data.notifications.filter((n) => !n.id.startsWith('due-'))].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  const unread = notices.filter((n) => !n.readBy.includes(user.id)).length;
  const markRead = async (id) => {
    try {
      await run('readNotifications', { id }, 'Notifications updated.');
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className={`crm crm-shell ${collapsed ? 'crm-collapsed' : ''}`} dir="ltr" lang="en">
      <a className="crm-skip" href="#crm-content">
        Skip to workspace content
      </a>
      <aside className="crm-sidebar">
        <Sidebar admin={admin} base={base} collapsed={collapsed} />
        <button
          className="crm-collapse"
          aria-label="Toggle sidebar"
          onClick={() => dispatch(sidebarToggled())}
        >
          <PanelLeftClose size={19} />
          {!collapsed && 'Collapse sidebar'}
        </button>
      </aside>
      <div className="crm-body">
        <header className="crm-topbar">
          <button
            className="crm-icon crm-mobile-toggle"
            onClick={() => setDrawer(true)}
            aria-label="Open CRM navigation"
          >
            <Menu />
          </button>
          <div className="crm-global-search">
            <Search size={18} />
            <input
              aria-label="Search CRM"
              placeholder="Search leads, properties, people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
              }}
            />
            {needle && (
              <div className="crm-search-results">
                {matches.length ? (
                  matches.map((m) => (
                    <Link key={m.id} to={m.to}>
                      <strong>{m.title}</strong>
                      <small>{m.subtitle}</small>
                    </Link>
                  ))
                ) : (
                  <p>No matching records</p>
                )}
              </div>
            )}
          </div>
          <span
            className="crm-demo"
            title="This portfolio version uses local demo data. Backend integration is prepared for Supabase."
          >
            Demo Mode
          </span>
          <button
            className="crm-icon crm-bell"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => setNotifications(true)}
          >
            <Bell size={20} />
            {unread > 0 && <span>{unread}</span>}
          </button>
          <div className="crm-user-wrap">
            <button
              className="crm-user"
              aria-label="User menu"
              aria-expanded={userMenu}
              onClick={() => setUserMenu(!userMenu)}
            >
              <span className="crm-avatar">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
              <span>
                {user.name}
                <small>{label(user.role)}</small>
              </span>
            </button>
            {userMenu && (
              <div className="crm-user-menu">
                <Link to={admin ? '/admin/settings' : '/agent/profile'}>My workspace</Link>
                <button
                  onClick={() => {
                    authService.signOut();
                    dispatch(sessionChanged(null));
                    navigate('/login');
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="crm-content" className="crm-content">
          <nav className="crm-breadcrumb" aria-label="CRM breadcrumb">
            <Link to={`${base}/dashboard`}>{admin ? 'Admin' : 'Agent'}</Link>
            {location.pathname
              .split('/')
              .slice(2)
              .map((part, i) => (
                <span key={part}>
                  <ChevronRight size={13} />
                  {i === 0 && location.pathname.split('/').length > 3 ? (
                    <Link to={`${base}/${part}`}>{label(part)}</Link>
                  ) : (
                    label(part.startsWith('LEAD-') ? 'Lead detail' : part)
                  )}
                </span>
              ))}
          </nav>
          {data.loading ? (
            <div className="crm-skeleton" role="status">
              Loading workspace…
            </div>
          ) : data.error ? (
            <p className="crm-error" role="alert">
              {data.error}
            </p>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="crm-footer">
          Dubai House CRM <span>Local demo · Times shown in your browser’s timezone</span>
        </footer>
      </div>
      {drawer && (
        <Dialog title="Workspace navigation" onClose={() => setDrawer(false)}>
          <div className="crm-drawer">
            <Sidebar admin={admin} base={base} onNavigate={() => setDrawer(false)} />
          </div>
        </Dialog>
      )}
      {notifications && (
        <Dialog title="Notifications" onClose={() => setNotifications(false)}>
          <div className="crm-notifications">
            <Button secondary onClick={() => markRead()}>
              Mark all as read
            </Button>
            {error && <p role="alert">{error}</p>}
            {notices.length ? (
              notices.map((n) => (
                <article key={n.id} className={n.readBy.includes(user.id) ? 'read' : ''}>
                  <Link to={`${base}/leads/${n.leadId}`} onClick={() => setNotifications(false)}>
                    {n.message}
                  </Link>
                  <small>{dateTime(n.createdAt)}</small>
                  {!n.readBy.includes(user.id) && (
                    <button onClick={() => markRead(n.id)}>Mark as read</button>
                  )}
                </article>
              ))
            ) : (
              <EmptyState title="You’re all caught up" />
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
export const AdminLayout = () => <CRMLayout admin />;
export const AgentLayout = () => <CRMLayout />;
