import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
export default function PropertySearch() {
  const { t } = useLanguage();
  const { locations, categories } = useCatalog();
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState('buy');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams({
      purpose,
    });
    if (location) params.set('location', location);
    if (type) params.set('type', type);
    navigate(`/properties?${params}`);
  }
  return (
    <form className="hero-search" onSubmit={submit}>
      <div className="search-tabs" role="group" aria-label={t('Property purpose')}>
        {[
          ['buy', 'Buy'],
          ['rent', 'Rent'],
          ['off-plan', 'Off-plan'],
          ['commercial', 'Commercial'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={purpose === value ? 'selected' : ''}
            aria-pressed={purpose === value}
            onClick={() => {
              setPurpose(value);
              if (value === 'commercial') setType('commercial');
              else if (type === 'commercial') setType('');
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="search-fields">
        <MapPin size={21} />
        <label>
          <span>{t('Location')}</span>
          <select
            aria-label={t('Search location')}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">{t('Dubai, UAE')}</option>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {t(l.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('Property type')}</span>
          <select
            aria-label={t('Search property type')}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{t('Any property')}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {t(c.name)}
              </option>
            ))}
          </select>
        </label>
        <button className="search-submit" aria-label={t('Search properties')}>
          <Search size={22} />
        </button>
      </div>
    </form>
  );
}
