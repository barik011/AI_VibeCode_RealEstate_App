import { useSelector } from 'react-redux';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectUser } from '../crm/store';
import { homeFor } from '../crm/constants';
export function ProtectedRoute() {
  const user = useSelector(selectUser);
  const loading = useSelector((state) => state.auth.loading);
  const location = useLocation();
  if (loading)
    return (
      <div className="crm-skeleton" role="status">
        Restoring your session…
      </div>
    );
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
export function RoleGuard({ role }) {
  const user = useSelector(selectUser);
  return user?.role === role ? (
    <Outlet />
  ) : (
    <div className="crm crm-denied" dir="ltr">
      <h1>Access restricted</h1>
      <p>This workspace requires the {role.toLowerCase()} demo account.</p>
      <Link className="crm-button" to={homeFor(user)}>
        Return to your dashboard
      </Link>
      <Link className="crm-button secondary" to="/login">
        Switch account
      </Link>
    </div>
  );
}
