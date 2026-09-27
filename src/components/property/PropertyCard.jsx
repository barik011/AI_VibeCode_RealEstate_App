import { useLanguage } from '../../i18n/LanguageProvider';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpRight, Bath, BedDouble, Heart, Maximize } from 'lucide-react';
import { toggleFavorite } from '../../store/store';
import { money, purposeLabel } from '../../config/siteConfig';
import { Photo, useToast } from '../ui';
export function FavoriteButton({ property, className = '' }) {
  const { t } = useLanguage();
  const saved = useSelector((state) => state.favorites.ids.includes(property.id));
  const dispatch = useDispatch();
  const notify = useToast();
  return (
    <button
      className={`favorite-button ${saved ? 'saved' : ''} ${className}`}
      aria-label={t('{0} {1}{2} favorites', {
        0: saved ? 'Remove' : 'Save',
        1: property.title,
        2: saved ? ' from' : ' to',
      })}
      aria-pressed={saved}
      onClick={() => {
        dispatch(toggleFavorite(property.id));
        notify(saved ? 'Property removed from favorites.' : 'Property added to favorites.');
      }}
    >
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
export function PropertyFacts({ property }) {
  const { t } = useLanguage();
  return (
    <div className="property-facts">
      <span>
        <BedDouble />
        {t(
          property.bedrooms === 0
            ? property.category === 'commercial'
              ? 'Office'
              : 'Studio'
            : `${property.bedrooms} beds`,
        )}
      </span>
      <span>
        <Bath />
        {t(property.bathrooms)}
        {t(' baths')}
      </span>
      <span>
        <Maximize />
        {t(property.area.toLocaleString())}
        {t(' sq ft')}
      </span>
    </div>
  );
}
export function PropertyCard({ property }) {
  const { t } = useLanguage();
  return (
    <article className="property-card">
      <div className="property-image">
        <Link to={`/property/${property.slug}`} tabIndex={-1} aria-hidden="true">
          <Photo src={property.images[0]} alt={t(property.title)} />
        </Link>
        <span className="status-badge">{t(purposeLabel(property.purpose))}</span>
        <FavoriteButton property={property} />
      </div>
      <div className="property-card-body">
        <Link to={`/property/${property.slug}`} className="property-title">
          <h3>{t(property.title)}</h3>
        </Link>
        <p>
          {t(property.location)}
          {t(', Dubai')}
        </p>
        <PropertyFacts property={property} />
        <div className="property-price">
          <strong>
            {t(money(property.price))}
            {property.purpose === 'rent' && <small>{t(' / year')}</small>}
          </strong>
          <Link
            to={`/property/${property.slug}`}
            className="round-arrow"
            aria-label={t('View {0}', {
              0: property.title,
            })}
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function PropertyGrid({ properties, list = false }) {
  return (
    <div className={`property-grid ${list ? 'list-view' : ''}`}>
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
