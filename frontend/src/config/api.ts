const removeTrailingSlash = (value: string) => {
  return value ? value.replace(/\/$/, '') : value;
};

export const API_BASE_URL = removeTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'https://frankloo.mccmrfip.in/api'
);

export const BACKEND_BASE_URL = removeTrailingSlash(
  import.meta.env.VITE_BACKEND_BASE_URL || 'https://frankloo.mccmrfip.in'
);

export const SOCKET_URL = removeTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || 'https://frankloo.mccmrfip.in'
);

export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export const backendUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

export const getEmailDomain = () => {
  return import.meta.env.VITE_EMAIL_DOMAIN || 'boards.frankloo.app';
};