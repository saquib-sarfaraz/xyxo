export const REFRESH_TOKEN_COOKIE_NAME = 
  process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';
export const REFRESH_TOKEN_COOKIE_PATH = 
  process.env.REFRESH_TOKEN_COOKIE_PATH || '/api/auth';
export const AUTH_DEBUG = process.env.AUTH_DEBUG === 'true';