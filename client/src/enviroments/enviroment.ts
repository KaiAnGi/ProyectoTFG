const runtimeWindow = typeof window !== 'undefined' ? window : null;
const runtimeHost = runtimeWindow?.location.hostname || 'localhost';

// Optional runtime overrides exposed through the browser console/global scope.
// Default protocol follows the page protocol (so HTTPS pages call HTTPS APIs).
const backendProtocol =
  (globalThis as any).RPS_BACKEND_PROTOCOL ||
  runtimeWindow?.location.protocol?.replace(':', '') ||
  'http';

// Default backend host: when developing locally use localhost, otherwise use the deployed server host.
// Replace 'server-567m.onrender.com' with your actual backend host if different.
const defaultBackendHost = runtimeHost === 'localhost' ? 'localhost' : 'server-567m.onrender.com';
const backendHost = (globalThis as any).RPS_BACKEND_HOST || defaultBackendHost;

// Allow an optional port override. If empty, omit the port from the URL.
const backendPortRaw = (globalThis as any).RPS_BACKEND_PORT ?? runtimeWindow?.location.port ?? '';
const backendPort =
  backendPortRaw !== '' && backendPortRaw !== undefined && backendPortRaw !== null
    ? String(backendPortRaw)
    : '';

const backendBaseUrl = backendPort
  ? `${backendProtocol}://${backendHost}:${backendPort}`
  : `${backendProtocol}://${backendHost}`;

export const environment = {
  production: false,
  socketUrl: backendBaseUrl,
  apiUrl: `${backendBaseUrl}/api`,
};
