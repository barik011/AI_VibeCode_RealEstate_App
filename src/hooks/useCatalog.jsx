import { createContext, useContext, useEffect, useState } from 'react';
import { catalogService } from '../services/catalog';
import { crmService } from '../services/crmService';
const CatalogContext = createContext(null);
export function CatalogProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null });
  useEffect(() => {
    let active = true;
    const unsubscribe = crmService.subscribe((data) => {
      if (active)
        setState((previous) => ({
          ...previous,
          properties: data.properties.filter((p) => p.status === 'ACTIVE'),
        }));
    });
    const names = ['properties', 'locations', 'categories', 'articles', 'testimonials'];
    Promise.all(names.map((name) => catalogService.getCollection(name)))
      .then((values) => {
        if (active)
          setState({
            ...Object.fromEntries(names.map((name, i) => [name, values[i]])),
            loading: false,
            error: null,
          });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}
export const useCatalog = () => useContext(CatalogContext);
