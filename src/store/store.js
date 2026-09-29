import { configureStore, createSlice } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';
import { authSlice, crmSlice, uiSlice, initializeCRM } from '../features/crm/store';
const saved = storage.get('favorites', []);
const favoriteSlice = createSlice({
  name: 'favorites',
  initialState: { ids: Array.isArray(saved) ? saved.filter(Number.isInteger) : [] },
  reducers: {
    toggleFavorite(state, { payload }) {
      state.ids = state.ids.includes(payload)
        ? state.ids.filter((id) => id !== payload)
        : [...state.ids, payload];
    },
  },
});
export const { toggleFavorite } = favoriteSlice.actions;
export const store = configureStore({
  reducer: {
    favorites: favoriteSlice.reducer,
    auth: authSlice.reducer,
    crm: crmSlice.reducer,
    crmUi: uiSlice.reducer,
  },
});
initializeCRM(store);
store.subscribe(() => storage.set('favorites', store.getState().favorites.ids));
