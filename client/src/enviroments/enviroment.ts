const runtimeWindow = typeof window !== 'undefined' ? window : null;
const runtimeHost = runtimeWindow?.location.hostname || 'localhost';

// Optional runtime overrides exposed through the browser console/global scope.
const backendProtocol = (globalThis as any).__RPS_BACKEND_PROTOCOL__ || 'http';
const backendHost = (globalThis as any).__RPS_BACKEND_HOST__ || runtimeHost;
const backendPort = Number((globalThis as any).__RPS_BACKEND_PORT__ || 3000);
const backendBaseUrl = `${backendProtocol}://${backendHost}:${backendPort}`;

export const environment = {
  production: false,
  socketUrl: backendBaseUrl,
  apiUrl: `${backendBaseUrl}/api`
};
