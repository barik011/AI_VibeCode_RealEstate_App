import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Grid2X2, List, SlidersHorizontal, X } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { filterProperties } from '../services/catalog';
import { siteConfig } from '../config/siteConfig';
import { Breadcrumb, Button, EmptyState, SEO } from '../components/ui';
import { PropertyGrid } from '../components/property/PropertyCard';
import NotFound from './NotFound';
function FilterPanel({ filters, update, reset, locations, categories }) {
  const { t } = useLanguage();
  return (
    <div className="filter-fields">
      <label className="filter-query">
        {t('Find a property')}
        <input
          aria-label={t('Search listings')}
          value={filters.q || ''}
          onChange={(e) => update('q', e.target.value)}
          placeholder={t('Name, neighbourhood, keyword…')}
        />
      </label>
      <label>
        {t('Purpose')}
        <select
          aria-label={t('Purpose')}
          value={filters.purpose || ''}
          onChange={(e) => update('purpose', e.target.value)}
        >
          <option value="">{t('All properties')}</option>
          <option value="buy">{t('Buy')}</option>
          <option value="rent">{t('Rent')}</option>
          <option value="off-plan">{t('Off-plan')}</option>
          <option value="commercial">{t('Commercial')}</option>
        </select>
      </label>
      <label>
        {t('Property type')}
        <select
          aria-label={t('Property type')}
          value={filters.type || ''}
          onChange={(e) => update('type', e.target.value)}
        >
          <option value="">{t('All types')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {t(c.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Location')}
        <select
          aria-label={t('Location')}
          value={filters.location || ''}
          onChange={(e) => update('location', e.target.value)}
        >
          <option value="">{t('All locations')}</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {t(l.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Minimum price (AED)')}
        <input
          aria-label={t('Minimum price')}
          type="number"
          min="0"
          value={filters.min || ''}
          onChange={(e) => update('min', e.target.value)}
          placeholder={t('No minimum')}
        />
      </label>
      <label>
        {t('Maximum price (AED)')}
        <input
          aria-label={t('Maximum price')}
          type="number"
          min="0"
          value={filters.max || ''}
          onChange={(e) => update('max', e.target.value)}
          placeholder={t('No maximum')}
        />
      </label>
      <label>
        {t('Bedrooms')}
        <select
          aria-label={t('Bedrooms')}
          value={filters.beds || ''}
          onChange={(e) => update('beds', e.target.value)}
        >
          <option value="">{t('Any')}</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {t(n)}+
            </option>
          ))}
        </select>
      </label>
      <label>
        {t('Bathrooms')}
        <select
          aria-label={t('Bathrooms')}
          value={filters.baths || ''}
          onChange={(e) => update('baths', e.target.value)}
        >
          <option value="">{t('Any')}</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {t(n)}+
            </option>
          ))}
        </select>
      </label>
      <button className="reset-filters" onClick={reset}>
        <X size={14} />
        {t('Reset filters')}
      </button>
    </div>
  );
}
export default function Properties({ favorites = false, search = false }) {
  const { t } = useLanguage();
  const { properties, locations, categories } = useCatalog();
  const { slug } = useParams();
  const ids = useSelector((state) => state.favorites.ids);
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = Object.fromEntries(params);
  if (slug) filters.type = slug;
  const category = categories.find((c) => c.slug === slug);
  if (slug && !category) return <NotFound />;
  const results = filterProperties(
    favorites ? properties.filter((p) => ids.includes(p.id)) : properties,
    filters,
  );
  const totalPages = Math.max(1, Math.ceil(results.length / siteConfig.paginationSize));
  const page = Math.max(1, Math.min(totalPages, parseInt(params.get('page'), 10) || 1));
  const update = (key, value) => {
    // History updates before React Router commits the next render. Reading it here
    // preserves every selection when several controls change in quick succession.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, {
      replace: key === 'q' || key === 'min' || key === 'max',
    });
  };
  const title = favorites
    ? 'Your Saved Places'
    : search
      ? 'Find Your Possibility'
      : category
        ? `Exceptional ${category.name}`
        : 'A Place to Call Yours';
  return (
    <div className="page-shell">
      <SEO title={t(favorites ? 'Saved Properties' : 'Properties for Sale & Rent in Dubai')} />
      <Breadcrumb
        items={[
          {
            label: favorites ? 'Saved properties' : 'Properties',
          },
        ]}
      />
      <div className="listing-heading">
        <div>
          <p className="eyebrow">
            {t(favorites ? 'Your personal collection' : 'Exceptional homes. Extraordinary living.')}
          </p>
          <h1>{t(title)}</h1>
          <p>
            {t(
              favorites
                ? 'A little closer to the home you have in mind.'
                : 'Explore a carefully selected collection of Dubai’s finest properties.',
            )}
          </p>
        </div>
        <span className="collection-mark">
          {t('THE')}
          <br />
          {t('COLLECTION')}
          <span>01—20</span>
        </span>
      </div>
      <button
        className="filter-toggle button"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-expanded={filtersOpen}
      >
        <SlidersHorizontal size={16} />
        {t(filtersOpen ? 'Hide filters' : 'Refine your search')}
      </button>
      <div className={`filters ${filtersOpen ? 'open' : ''}`}>
        <FilterPanel
          filters={filters}
          update={update}
          reset={() => setParams({})}
          locations={locations}
          categories={categories}
        />
      </div>
      <div className="results-toolbar">
        <p>
          <strong>{t(results.length)}</strong> {t(results.length === 1 ? 'property' : 'properties')}
          {filters.purpose === 'rent' && <small>{t(' · Rental prices are per year')}</small>}
        </p>
        <div>
          <label className="sort-control">
            {t('Sort by')}
            <select
              aria-label={t('Sort properties')}
              value={filters.sort || 'featured'}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="featured">{t('Featured')}</option>
              <option value="newest">{t('Newest')}</option>
              <option value="price-asc">{t('Price: low to high')}</option>
              <option value="price-desc">{t('Price: high to low')}</option>
              <option value="area">{t('Largest area')}</option>
            </select>
          </label>
          <button
            className={`icon-button ${!list ? 'active' : ''}`}
            aria-label={t('Grid view')}
            aria-pressed={!list}
            onClick={() => setList(false)}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            className={`icon-button ${list ? 'active' : ''}`}
            aria-label={t('List view')}
            aria-pressed={list}
            onClick={() => setList(true)}
          >
            <List size={19} />
          </button>
        </div>
      </div>
      {results.length ? (
        <PropertyGrid
          properties={results.slice(
            (page - 1) * siteConfig.paginationSize,
            page * siteConfig.paginationSize,
          )}
          list={list}
        />
      ) : (
        <EmptyState
          title={t(favorites && !ids.length ? 'You haven’t saved any properties yet.' : undefined)}
          text={t(
            favorites && !ids.length
              ? 'Tap the heart on a home you love to keep it here.'
              : undefined,
          )}
        >
          {favorites && !ids.length ? (
            <Button to="/properties">{t('Explore properties')}</Button>
          ) : (
            <Button onClick={() => setParams({})}>{t('Clear filters')}</Button>
          )}
        </EmptyState>
      )}
      {totalPages > 1 && (
        <nav className="pagination" aria-label={t('Property pages')}>
          <button disabled={page === 1} onClick={() => update('page', String(page - 1))}>
            {t('Previous')}
          </button>
          {t(
            Array.from(
              {
                length: totalPages,
              },
              (_, i) => (
                <button
                  key={i}
                  aria-current={page === i + 1 ? 'page' : undefined}
                  className={page === i + 1 ? 'active' : ''}
                  onClick={() => update('page', String(i + 1))}
                >
                  {t(i + 1)}
                </button>
              ),
            ),
          )}
          <button disabled={page === totalPages} onClick={() => update('page', String(page + 1))}>
            {t('Next')}
          </button>
        </nav>
      )}
    </div>
  );
}
