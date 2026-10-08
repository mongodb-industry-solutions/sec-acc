import type { NextConfig } from 'next';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Same optional root .env as the backend. Runtime variables win. Only NEXT_PUBLIC_ names reach the browser.
loadEnv({ path: resolve(__dirname, '../.env'), quiet: true });

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
