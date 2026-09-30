import { Component, Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useCatalog } from './hooks/useCatalog';
import Layout from './components/layout/Layout';
import { EmptyState, Loader, ToastProvider } from './components/ui';
import { useLanguage } from './i18n/LanguageProvider';
import { ProtectedRoute, RoleGuard } from './features/auth/Guards';
const authPage = (name) =>
  lazy(() => import('./features/auth/Auth').then((m) => ({ default: m[name] })));
const crmPage = (file, name) =>
  lazy(() => import(`./features/crm/pages/${file}.jsx`).then((m) => ({ default: m[name] })));
const AuthLayout = authPage('AuthLayout');
const Login = authPage('Login');
const ForgotPassword = authPage('ForgotPassword');
const ResetPassword = authPage('ResetPassword');
const AdminLayout = lazy(() =>
  import('./features/crm/components/CRMLayout').then((m) => ({ default: m.AdminLayout })),
);
const AgentLayout = lazy(() =>
  import('./features/crm/components/CRMLayout').then((m) => ({ default: m.AgentLayout })),
);
const Dashboard = crmPage('Dashboard', 'Dashboard');
const Reports = crmPage('Dashboard', 'Reports');
const Leads = crmPage('Leads', 'Leads');
const LeadDetail = crmPage('Leads', 'LeadDetail');
const Tasks = crmPage('Work', 'Tasks');
const Viewings = crmPage('Work', 'Viewings');
const Calendar = crmPage('Work', 'Calendar');
const CRMProperties = crmPage('Properties', 'Properties');
const Agents = crmPage('Agents', 'Agents');
const AgentDetail = crmPage('Agents', 'AgentDetail');
const Profile = crmPage('Agents', 'Profile');
const Settings = crmPage('Settings', 'Settings');
const Home = lazy(() => import('./pages/Home'));
const Properties = lazy(() => import('./pages/Properties'));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const NotFound = lazy(() => import('./pages/NotFound'));
const editorial = (name) =>
  lazy(() => import('./pages/Editorial').then((module) => ({ default: module[name] })));
const About = editorial('About');
const Invest = editorial('Invest');
const Locations = editorial('Locations');
const LocationDetails = editorial('LocationDetails');
const Blog = editorial('Blog');
const BlogDetails = editorial('BlogDetails');
const Contact = editorial('Contact');
const Legal = editorial('Legal');
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <ErrorFallback /> : this.props.children;
  }
}
function ErrorFallback() {
  const { t } = useLanguage();
  return (
    <div className="empty-state">
      <h1>{t('A small detour.')}</h1>
      <p>{t('Something did not load correctly. Please refresh to try again.')}</p>
      <button className="button" onClick={() => window.location.reload()}>
        {t('Try again')}
      </button>
    </div>
  );
}
function CategoryRoute() {
  const { slug } = useParams();
  const { categories } = useCatalog();
  return categories.some((c) => c.slug === slug) ? (
    <Navigate to={`/properties?type=${slug}`} replace />
  ) : (
    <NotFound />
  );
}
function PublicLayout() {
  const { t } = useLanguage();
  const { loading, error } = useCatalog();
  if (loading) return <Loader />;
  if (error)
    return (
      <EmptyState title="Our collection is temporarily unavailable." text={error}>
        <button className="button" onClick={() => window.location.reload()}>
          {t('Try again')}
        </button>
      </EmptyState>
    );
  return <Layout />;
}
export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<RoleGuard role="ADMIN" />}>
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="leads/:id" element={<LeadDetail />} />
                    <Route path="properties" element={<CRMProperties />} />
                    <Route path="agents" element={<Agents />} />
                    <Route path="agents/:id" element={<AgentDetail />} />
                    <Route path="viewings" element={<Viewings />} />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Route>
                </Route>
                <Route element={<RoleGuard role="AGENT" />}>
                  <Route path="agent" element={<AgentLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="leads" element={<Leads />} />
                    <Route path="leads/:id" element={<LeadDetail />} />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="viewings" element={<Viewings />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/agent/dashboard" replace />} />
                  </Route>
                </Route>
              </Route>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="properties" element={<Properties />} />
                <Route path="category/:slug" element={<CategoryRoute />} />
                <Route path="property/:slug" element={<PropertyDetails />} />
                <Route path="favorites" element={<Properties favorites />} />
                <Route path="search" element={<Properties search />} />
                <Route path="about" element={<About />} />
                <Route path="invest" element={<Invest />} />
                <Route path="locations" element={<Locations />} />
                <Route path="location/:slug" element={<LocationDetails />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogDetails />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy" element={<Legal type="privacy" />} />
                <Route path="terms" element={<Legal type="terms" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
