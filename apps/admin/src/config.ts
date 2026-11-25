// Central API Base URL Configuration
// Defaults to the live Render backend: https://lagos-life-api.onrender.com
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'https://lagos-life-api.onrender.com';
