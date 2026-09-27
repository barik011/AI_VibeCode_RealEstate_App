import { useLanguage } from '../../i18n/LanguageProvider';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { siteConfig } from '../../config/siteConfig';
export function Photo({ src, alt, className = '', eager = false, ...props }) {
  const { t } = useLanguage();
  return (
    <img
      src={src || siteConfig.fallback}
      alt={t(alt)}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = siteConfig.fallback;
      }}
      {...props}
    />
  );
}
export function Button({ to, children, light = false, className = '', arrow = true, ...props }) {
  const { t } = useLanguage();
  const classes = `button ${light ? 'button-light' : ''} ${className}`;
  return to ? (
    <Link to={to} className={classes} {...props}>
      {t(children)}
      {arrow && <ArrowRight size={16} />}
    </Link>
  ) : (
    <button className={classes} {...props}>
      {t(children)}
      {arrow && <ArrowRight size={16} />}
    </button>
  );
}
export function TextLink({ to, children }) {
  const { t } = useLanguage();
  return (
    <Link className="text-link" to={to}>
      {t(children)}
      <ArrowRight size={15} />
    </Link>
  );
}
export function SectionHeader({ title, subtitle, to, link = 'View all' }) {
  const { t } = useLanguage();
  return (
    <div className="section-heading">
      <div>
        <h2>{t(title)}</h2>
        {subtitle && <p>{t(subtitle)}</p>}
      </div>
      {to && <TextLink to={to}>{t(link)}</TextLink>}
    </div>
  );
}
export function Reveal({ children, className = '' }) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={
        reduce
          ? false
          : {
              opacity: 0,
              y: 18,
            }
      }
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.08,
      }}
      transition={{
        duration: 0.6,
      }}
    >
      {t(children)}
    </motion.div>
  );
}
export function EmptyState({
  title = 'No properties found matching your criteria.',
  text = 'Try a different location or adjust your filters.',
  children,
}) {
  const { t } = useLanguage();
  return (
    <div className="empty-state">
      <span className="eyebrow">{t('A fresh perspective')}</span>
      <h2>{t(title)}</h2>
      <p>{t(text)}</p>
      {children || <Button to="/properties">{t('Explore properties')}</Button>}
    </div>
  );
}
export function Loader() {
  const { t } = useLanguage();
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {t('Finding your next possibility…')}
    </div>
  );
}
export function Breadcrumb({ items }) {
  const { t } = useLanguage();
  return (
    <nav className="breadcrumb" aria-label={t('Breadcrumb')}>
      <Link to="/">{t('Home')}</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span aria-hidden="true">/</span>
          {item.to ? (
            <Link to={item.to}>{t(item.label)}</Link>
          ) : (
            <span aria-current="page">{t(item.label)}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function SEO({
  title,
  description = 'Discover exceptional homes, considered advice and new possibilities in Dubai with Dubai bayt.',
}) {
  const { t } = useLanguage();
  useEffect(() => {
    document.title = `${t(title)} | ${t('Dubai bayt')}`;
    document.querySelector('meta[name="description"]').setAttribute('content', t(description));
  }, [title, description, t]);
  return null;
}
export function Modal({ open, onClose, title, children, className = '' }) {
  const { t } = useLanguage();
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = dialog.current;
    el.showModal();
    el.querySelector('[data-autofocus]')?.focus();
    return () => {
      el.close();
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [open]);
  return open ? (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={t(title)}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{t(title)}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t('Close dialog')}>
            <X />
          </button>
        </div>
        {t(children)}
      </div>
    </dialog>
  ) : null;
}
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = (text) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(''), 4000);
  };
  return (
    <ToastContext.Provider value={notify}>
      {t(children)}
      <div className={`toast ${message ? 'visible' : ''}`} role="status">
        {message && (
          <>
            <Check size={17} />
            {t(message)}
            <button aria-label={t('Dismiss notification')} onClick={() => setMessage('')}>
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
