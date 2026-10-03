import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (
    command === 'build' &&
    mode === 'production' &&
    (env.VITE_DATA_BACKEND !== 'supabase' ||
      !env.VITE_SUPABASE_URL ||
      !(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY))
  ) {
    throw new Error(
      'Production builds require VITE_DATA_BACKEND=supabase and a Supabase URL and public key. Use --mode demo explicitly for a demonstration build.',
    );
  }
  return { plugins: [react(), tailwindcss()], server: { port: 5173 } };
});
