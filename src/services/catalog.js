import properties from '../data/properties.json';
import locations from '../data/locations.json';
import categories from '../data/categories.json';
import articles from '../data/blog.json';
import testimonials from '../data/testimonials.json';
import { translate, normalizeSearch } from '../i18n/translate';
import { crmService } from './crmService';

const collections = { properties, locations, categories, articles, testimonials };
export const catalogService = {
  async getCollection(name) {
    if (name === 'properties')
      return (await crmService.getSnapshot()).properties.filter((p) => p.status === 'ACTIVE');
    if (!collections[name]) throw new Error('Collection unavailable');
    return collections[name];
  },
};
export function filterProperties(items, filters = {}) {
  const needle = normalizeSearch(filters.q || '');
  const results = items.filter(
    (p) =>
      (!needle ||
        normalizeSearch(
          `${p.title} ${p.location} ${p.category} ${p.purpose} ${p.purpose === 'buy' ? 'sale' : ''} ${[p.title, p.location, p.category, p.purpose, { buy: 'For sale', rent: 'For rent', 'off-plan': 'Off plan', commercial: 'Commercial' }[p.purpose]].map((value) => translate(value, 'ar')).join(' ')}`,
        ).includes(needle)) &&
      (!filters.purpose || p.purpose === filters.purpose) &&
      (!filters.location || p.locationSlug === filters.location) &&
      (!filters.type || p.category === filters.type) &&
      (!filters.min || p.price >= Number(filters.min)) &&
      (!filters.max || p.price <= Number(filters.max)) &&
      (!filters.beds || p.bedrooms >= Number(filters.beds)) &&
      (!filters.baths || p.bathrooms >= Number(filters.baths)),
  );
  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    area: (a, b) => b.area - a.area,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    featured: (a, b) => Number(b.featured) - Number(a.featured),
  };
  return results.sort(sorters[filters.sort] || sorters.featured);
}
export function findSimilar(items, property) {
  const score = (p) =>
    (p.category === property.category ? 5 : 0) +
    (p.locationSlug === property.locationSlug ? 4 : 0) +
    (p.purpose === property.purpose ? 2 : 0) +
    (Math.abs(p.price - property.price) / property.price < 0.3 ? 1 : 0);
  return items
    .filter((p) => p.id !== property.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}
export const propertyService = {
  async getAll() {
    return catalogService.getCollection('properties');
  },
  async getBySlug(slug) {
    return (await this.getAll()).find((p) => p.slug === slug);
  },
  async search(filters) {
    return filterProperties(await this.getAll(), filters);
  },
  async getFeatured() {
    return (await this.getAll()).filter((p) => p.featured);
  },
};
