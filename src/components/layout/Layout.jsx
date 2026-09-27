import { LanguageSwitch, useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Heart, Menu, Search } from 'lucide-react';
import { Instagram, Linkedin, Youtube, Facebook } from './SocialIcons';
import { useSelector } from 'react-redux';
import { useCatalog } from '../../hooks/useCatalog';
import { filterProperties } from '../../services/catalog';
import { siteConfig, money } from '../../config/siteConfig';
import { Button, Modal, Photo } from '../ui';
import { NewsletterForm } from '../forms/Forms';
const nav = [
  ['/', 'Home'],
  ['/properties', 'Properties'],
  ['/about', 'About'],
  ['/invest', 'Invest'],
  ['/blog', 'Blog'],
  ['/contact', 'Contact'],
];
export function Logo() {
  const { t } = useLanguage();
  return (
    <Link to="/" className="logo" aria-label={t('Dubai bayt home')}>
      <svg width="31" height="43" viewBox="0 0 31 43" fill="none" aria-hidden="true">
        <path d="M3 35V10M10 41V1M17 38V14M24 33V21" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>
        {t('DUBAI BAYT')}
        <small>{t('PROPERTIES FOR A BRIGHTER TOMORROW')}</small>
      </span>
    </Link>
  );
}
function SearchOverlay({ open, onClose }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const { properties } = useCatalog();
  const navigate = useNavigate();
  const results = filterProperties(properties, {
    q: query,
  }).slice(0, 5);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Find your next possibility')}
      className="search-modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/search?q=${encodeURIComponent(query)}`);
          onClose();
        }}
      >
        <label className="overlay-search">
          <Search size={22} />
          <input
            autoFocus
            data-autofocus
            aria-label={t('Search properties globally')}
            placeholder={t('Try Palm Jumeirah, villa, or waterfront…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="icon-button" aria-label={t('See all search results')}>
            <ArrowUp className="rotate-90" size={20} />
          </button>
        </label>
      </form>
      <p className="eyebrow">{t(query ? 'Matching possibilities' : 'A few places to begin')}</p>
      <div className="search-suggestions">
        {t(
          results.length ? (
            results.map((p) => (
              <Link key={p.id} to={`/property/${p.slug}`} onClick={onClose}>
                <Photo src={p.images[0]} alt={t('')} />
                <span>
                  <strong>{t(p.title)}</strong>
                  <small>{t(p.location)}</small>
                </span>
                <span>{t(money(p.price))}</span>
              </Link>
            ))
          ) : (
            <p>{t('No matching homes. Try another location or property type.')}</p>
          ),
        )}
      </div>
    </Modal>
  );
}
export default function Layout() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const count = useSelector((state) => state.favorites.ids.length);
  const { categories, locations } = useCatalog();
  useEffect(() => {
    const change = () => setScrolled(window.scrollY > 30);
    change();
    window.addEventListener('scroll', change, {
      passive: true,
    });
    return () => window.removeEventListener('scroll', change);
  }, []);
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [pathname]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('Skip to content')}
      </a>
      <header className={`site-header ${pathname !== '/' || scrolled ? 'solid' : ''}`}>
        <Logo />
        <nav className="desktop-nav" aria-label={t('Main navigation')}>
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitch />
          <button
            className="icon-button"
            onClick={() => setSearch(true)}
            aria-label={t('Open search')}
          >
            <Search size={21} />
          </button>
          <Link
            className="icon-button saved-link"
            to="/favorites"
            aria-label={t('Saved properties ({0})', {
              0: count,
            })}
          >
            <Heart size={20} />
            {count > 0 && <span>{t(count)}</span>}
          </Link>
          <Button to="/contact?type=expert" light className="header-cta">
            {t('Talk to an expert')}
          </Button>
          <button
            className="icon-button mobile-menu-button"
            aria-label={t('Open navigation menu')}
            aria-expanded={menu}
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <Modal
        open={menu}
        onClose={() => setMenu(false)}
        title={t('Dubai bayt')}
        className="mobile-menu"
      >
        <nav aria-label={t('Mobile navigation')}>
          {[...nav, ['/favorites', `Saved properties (${count})`]].map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setMenu(false)}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <Button to="/contact?type=expert" onClick={() => setMenu(false)}>
          {t('Talk to an expert')}
        </Button>
      </Modal>
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <Logo />
          <p>
            {t('Connecting people to exceptional properties')}
            <br />
            {t('in one of the world’s most inspiring cities.')}
          </p>
          <div className="social-links">
            {[
              [Instagram, 'instagram'],
              [Linkedin, 'linkedin'],
              [Youtube, 'youtube'],
              [Facebook, 'facebook'],
            ].map(([Icon, name]) => (
              <a
                key={name}
                href={siteConfig.socials[name]}
                target="_blank"
                rel="noreferrer"
                aria-label={t('{0} (opens a new tab)', {
                  0: name,
                })}
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        <div className="footer-column">
          <h3>{t('Quick links')}</h3>
          {nav
            .filter(([to]) => to !== '/invest')
            .map(([to, name]) => (
              <Link key={to} to={to}>
                {t(name)}
              </Link>
            ))}
          <Link to="/favorites">{t('Saved properties')}</Link>
        </div>
        <div className="footer-column">
          <h3>{t('Properties')}</h3>
          {categories.map((c) => (
            <Link key={c.slug} to={`/properties?type=${c.slug}`}>
              {t(c.name)}
            </Link>
          ))}
        </div>
        <div className="footer-column">
          <h3>{t('Locations')}</h3>
          {locations.slice(0, 5).map((l) => (
            <Link key={l.slug} to={`/location/${l.slug}`}>
              {t(l.name)}
            </Link>
          ))}
        </div>
        <div className="footer-subscribe">
          <NewsletterForm />
          <div className="legal-links">
            <Link to="/privacy">{t('Privacy policy')}</Link>
            <Link to="/terms">{t('Terms & conditions')}</Link>
          </div>
          <small>
            © {t(new Date().getFullYear())}
            {t(' Dubai bayt. A demonstration website.')}
          </small>
        </div>
      </footer>
      {scrolled && (
        <button
          className="back-top"
          aria-label={t('Back to top')}
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
            })
          }
        >
          <ArrowUp size={17} />
        </button>
      )}
    </>
  );
}
