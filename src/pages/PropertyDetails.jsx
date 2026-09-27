import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Expand, MapPin, Share2 } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { findSimilar } from '../services/catalog';
import { money, purposeLabel } from '../config/siteConfig';
import { Breadcrumb, Modal, Photo, SectionHeader, SEO, useToast } from '../components/ui';
import { FavoriteButton, PropertyFacts, PropertyGrid } from '../components/property/PropertyCard';
import { ContactForm } from '../components/forms/Forms';
import NotFound from './NotFound';
function ImageGallery({ property }) {
  const { t, isRTL } = useLanguage();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const move = (delta) =>
    setIndex((i) => (i + delta + property.images.length) % property.images.length);
  const controls = (
    <>
      <button
        className="gallery-prev icon-button"
        aria-label={t('Previous property photo')}
        onClick={() => move(-1)}
      >
        <ArrowLeft />
      </button>
      <button
        className="gallery-next icon-button"
        aria-label={t('Next property photo')}
        onClick={() => move(1)}
      >
        <ArrowRight />
      </button>
    </>
  );
  return (
    <>
      <div className="gallery-main">
        <button
          className="gallery-open"
          onClick={() => setOpen(true)}
          aria-label={t('Enlarge property photo')}
        >
          <Photo
            src={property.images[index]}
            alt={t('{0}, view {1}', {
              0: property.title,
              1: index + 1,
            })}
            eager
          />
          <span>
            <Expand size={16} />
            {t('View gallery')}
          </span>
        </button>
        {t(controls)}
        <span className="gallery-counter">
          {t(index + 1)} / {t(property.images.length)}
        </span>
      </div>
      <div className="gallery-thumbnails">
        {property.images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            className={i === index ? 'active' : ''}
            aria-label={t('View property photo {0}', {
              0: i + 1,
            })}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            <Photo
              src={src}
              alt={t('Interior and exterior view {0}', {
                0: i + 1,
              })}
            />
          </button>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(property.title)}
        className="gallery-modal"
      >
        <div
          className="lightbox"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') move(isRTL ? -1 : 1);
            if (e.key === 'ArrowLeft') move(isRTL ? 1 : -1);
          }}
        >
          <Photo
            src={property.images[index]}
            alt={t('{0}, view {1}', {
              0: property.title,
              1: index + 1,
            })}
          />
          {t(controls)}
        </div>
      </Modal>
    </>
  );
}
export default function PropertyDetails() {
  const { t } = useLanguage();
  const { slug } = useParams();
  const { properties } = useCatalog();
  const property = properties.find((p) => p.slug === slug);
  const notify = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  if (!property) return <NotFound />;
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify('Property link copied.');
    } catch {
      setShareOpen(true);
    }
  };
  return (
    <div className="page-shell property-detail">
      <SEO
        title={t(property.title)}
        description={t('{0} in {1}. {2}. Explore this illustrative Dubai bayt property.', {
          0: property.title,
          1: property.location,
          2: money(property.price),
        })}
      />
      <Breadcrumb
        items={[
          {
            label: 'Properties',
            to: '/properties',
          },
          {
            label: property.title,
          },
        ]}
      />
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {t(purposeLabel(property.purpose))} · {t(property.reference)}
          </span>
          <h1>{t(property.title)}</h1>
          <Link to={`/location/${property.locationSlug}`} className="location-link">
            <MapPin size={16} />
            {t(property.location)}
            {t(', Dubai')}
          </Link>
        </div>
        <div className="detail-price">
          <strong>{t(money(property.price))}</strong>
          {property.purpose === 'rent' && <small>{t('per year')}</small>}
          <div>
            <FavoriteButton property={property} />
            <button className="share-button" onClick={share}>
              <Share2 size={16} />
              {t('Share')}
            </button>
          </div>
        </div>
      </div>
      <ImageGallery property={property} key={property.id} />
      <div className="detail-layout">
        <div>
          <PropertyFacts property={property} />
          <section className="detail-section">
            <h2>{t('A home with a different perspective.')}</h2>
            {property.description.split('\n\n').map((p) => (
              <p key={p}>{t(p)}</p>
            ))}
          </section>
          <section className="detail-section">
            <h2>{t('The finer details')}</h2>
            <dl className="specifications">
              {[
                ['Property type', property.category],
                ['Tenure', property.tenure],
                ['Furnishing', property.furnished],
                ['Status', purposeLabel(property.purpose)],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{t(key)}</dt>
                  <dd>{t(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="detail-section">
            <h2>{t('Made for better living')}</h2>
            <div className="amenity-grid">
              {property.amenities.map((a) => (
                <span key={a}>
                  <Check size={16} />
                  {t(a)}
                </span>
              ))}
            </div>
          </section>
          <section className="detail-section location-detail-card">
            <MapPin size={28} />
            <div>
              <h2>
                {t('At home in ')}
                {t(property.location)}
              </h2>
              <p>{t('Get to know the neighbourhood and explore more places nearby.')}</p>
              <Link className="text-link" to={`/location/${property.locationSlug}`}>
                {t('Explore the neighbourhood ')}
                <ArrowRight size={15} />
              </Link>
              <a
                className="text-link map-link"
                href={`https://www.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('View approximate area on map ')}
                <ArrowRight size={15} />
              </a>
            </div>
          </section>
        </div>
        <aside className="inquiry-panel">
          <div className="agent">
            <Photo src={property.agent.image} alt={t(property.agent.name)} />
            <div>
              <strong>{t(property.agent.name)}</strong>
              <span>{t(property.agent.role)}</span>
              <small>{t(property.agent.languages)}</small>
            </div>
          </div>
          <h2>{t('Let’s make it yours.')}</h2>
          <p>{t('Tell us about your plans for this property.')}</p>
          <ContactForm key={property.id} property={property} />
        </aside>
      </div>
      <section className="similar-properties">
        <SectionHeader title={t('More Places to Fall For')} to="/properties" />
        <PropertyGrid properties={findSimilar(properties, property)} />
      </section>
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('Share this property')}>
        <label>
          {t('Copy this link')}
          <input readOnly value={window.location.href} onFocus={(e) => e.target.select()} />
        </label>
      </Modal>
    </div>
  );
}
