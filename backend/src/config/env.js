import dotenv from 'dotenv';

dotenv.config();

const removeTrailingSlash = (value) => {
  return value ? value.replace(/\/$/, '') : value;
};

export const env = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || '0.0.0.0',

  backendBaseUrl: removeTrailingSlash(
    process.env.BACKEND_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`
  ),

  frontendBaseUrl: removeTrailingSlash(
    process.env.FRONTEND_BASE_URL || 'http://localhost:5173'
  ),

  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
};