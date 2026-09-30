import { configureStore, createSlice } from '@reduxjs/toolkit';
import { storage } from '../utils/storage';
import { authSlice, crmSlice, uiSlice, initializeCRM } from '../features/crm/store';
import { isSupabase } from '../services/supabase/client';
import { visitorService } from '../services/visitorService';
const saved = storage.get('favorites', []);
const favoriteSlice = createSlice({
  name: 'favorites',
  initialState: { ids: Array.isArray(saved) ? saved.filter(Number.isInteger) : [] },
  reducers: {
    favoritesReceived(state, { payload }) {
      state.ids = payload;
    },
    toggleFavorite(state, { payload }) {
      state.ids = state.ids.includes(payload)
        ? state.ids.filter((id) => id !== payload)
        : [...state.ids, payload];
    },
  },
});
export const toggleFavorite = (id) => async (dispatch) => {
  if (!isSupabase) {
    dispatch(favoriteSlice.actions.toggleFavorite(id));
    return;
  }
  const ids = await visitorService.favorites(id);
  dispatch(favoriteSlice.actions.favoritesReceived(ids));
};
export const store = configureStore({
  reducer: {
    favorites: favoriteSlice.reducer,
    auth: authSlice.reducer,
    crm: crmSlice.reducer,
    crmUi: uiSlice.reducer,
  },
});
initializeCRM(store);
if (isSupabase)
  visitorService
    .favorites()
    .then((ids) => store.dispatch(favoriteSlice.actions.favoritesReceived(ids)))
    .catch(() => {});
else store.subscribe(() => storage.set('favorites', store.getState().favorites.ids));
