import site from '../data/site.json';
export const siteConfig = structuredClone(site);
export const updateSiteConfig = (data) => Object.assign(siteConfig,data);
export const money = (value) => `AED ${new Intl.NumberFormat('en-AE').format(value)}`;
export const purposeLabel = (purpose) =>
  ({ buy: 'For sale', rent: 'For rent', 'off-plan': 'Off plan', commercial: 'Commercial' })[
    purpose
  ] || purpose;
