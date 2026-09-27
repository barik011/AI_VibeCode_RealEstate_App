import { Component, Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { useCatalog } from './hooks/useCatalog';
import Layout from './components/layout/Layout';
import { EmptyState, Loader, ToastProvider } from './components/ui';
import { useLanguage } from './i18n/LanguageProvider';
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
export default function App() {
  const { t } = useLanguage();
  const { loading, error } = useCatalog();
  if (loading) return <Loader />;
  if (error)
    return (
      <EmptyState
        title="Our collection is temporarily unavailable."
        text="Please refresh to try again."
      >
        <button className="button" onClick={() => window.location.reload()}>
          {t('Try again')}
        </button>
      </EmptyState>
    );
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route element={<Layout />}>
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
