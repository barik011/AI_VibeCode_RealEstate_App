import { useLanguage } from '../i18n/LanguageProvider';
import { Button, SEO } from '../components/ui';
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <section className="not-found">
      <SEO title={t('Page Not Found')} />
      <span className="eyebrow">{t('A little off the beaten path')}</span>
      <span className="error-number">404</span>
      <h1>{t('Page Not Found')}</h1>
      <p>{t('Let’s find your way to somewhere extraordinary.')}</p>
      <div>
        <Button to="/">{t('Back home')}</Button>
        <Button light to="/properties">
          {t('Explore properties')}
        </Button>
      </div>
    </section>
  );
}
