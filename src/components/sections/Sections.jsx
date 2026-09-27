import { useLanguage } from '../../i18n/LanguageProvider';
import { Link } from 'react-router-dom';
import { Building2, Globe2, Landmark, ShieldCheck, TrendingUp, Handshake } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import { siteConfig } from '../../config/siteConfig';
import { Button, Photo, SectionHeader } from '../ui';
export function Categories({ compact = false }) {
  const { t } = useLanguage();
  const { categories } = useCatalog();
  return (
    <section className={`categories-section ${compact ? 'compact' : ''}`}>
      <SectionHeader
        title={t('Explore by Category')}
        subtitle={t('Find a property that fits your lifestyle or investment goals.')}
        to="/properties"
      />
      <div className="category-grid">
        {categories.map((c) => (
          <Link to={`/properties?type=${c.slug}`} className="category-card" key={c.slug}>
            <Photo src={c.image} alt={t(c.name)} />
            <div>
              <h3>{t(c.name)}</h3>
              <p>{t(c.description)}</p>
              <span aria-hidden="true">⟶</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function InvestmentBenefits({ compact = false }) {
  const { t } = useLanguage();
  return (
    <section className={`investment-benefits ${compact ? 'compact' : ''}`}>
      <SectionHeader title={t('Why Invest in Dubai?')} to="/invest" link={t('Learn more')} />
      <div className="benefits-grid">
        {[
          [Landmark, 'A considered', 'investment'],
          [TrendingUp, 'Rental', 'opportunities'],
          [Building2, 'World-class', 'infrastructure'],
          [Globe2, 'A global', 'business hub'],
        ].map(([Icon, top, bottom]) => (
          <div className="benefit" key={top}>
            <Icon strokeWidth={1} />
            <span>
              {t(top)}
              <br />
              {t(bottom)}
            </span>
          </div>
        ))}
      </div>
      <Photo
        src={siteConfig.images.architecture}
        className="benefits-photo"
        alt={t('Dubai architecture')}
      />
    </section>
  );
}
export function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section className="final-cta">
      <Photo src={siteConfig.images.skyline} alt={t('Dubai skyline')} />
      <div>
        <p className="eyebrow">{t('Let’s build your tomorrow')}</p>
        <h2>{t('Ready to Find Your Place in Dubai?')}</h2>
        <p>{t('Expert advice, personal recommendations, and a world of possibilities.')}</p>
        <Button to="/contact?type=expert">{t('Talk to an expert')}</Button>
      </div>
      <span className="cta-note">
        {t('INVEST TODAY')}
        <br />
        {t('A BRIGHTER')}
        <br />
        {t('TOMORROW AWAITS')}
      </span>
    </section>
  );
}
export function StoryPoints() {
  const { t } = useLanguage();
  return (
    <div className="story-points">
      {[
        [Globe2, 'Trusted by', 'global investors'],
        [Handshake, 'End-to-end', 'support'],
        [ShieldCheck, 'Long-term', 'perspective'],
      ].map(([Icon, a, b]) => (
        <div key={a}>
          <span>
            <Icon size={21} strokeWidth={1} />
          </span>
          <p>
            {t(a)}
            <br />
            {t(b)}
          </p>
        </div>
      ))}
    </div>
  );
}
export function PageHero({ eyebrow, title, text, image }) {
  const { t } = useLanguage();
  return (
    <section className={`page-hero ${image ? 'with-image' : ''}`}>
      {t(image && <Photo src={image} alt={t('Dubai luxury real estate')} eager />)}
      <div>
        <span className="eyebrow">{t(eyebrow || 'Dubai bayt')}</span>
        <h1>{t(title)}</h1>
        {t(text && <p>{t(text)}</p>)}
      </div>
    </section>
  );
}
