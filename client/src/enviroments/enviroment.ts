const runtimeWindow = typeof window !== 'undefined' ? window : null;
const runtimeHost = runtimeWindow?.location.hostname || 'localhost';

// Optional runtime overrides exposed through the browser console/global scope.
// Default protocol follows the page protocol (so HTTPS pages call HTTPS APIs).
const backendProtocol = (globalThis as any).__RPS_BACKEND_PROTOCOL__ || (runtimeWindow?.location.protocol?.replace(':', '') || 'http');

// Default backend host: when developing locally use localhost, otherwise use the deployed server host.
// Replace 'server-567m.onrender.com' with your actual backend host if different.
const defaultBackendHost = runtimeHost === 'localhost' ? 'localhost' : 'server-567m.onrender.com';
const backendHost = (globalThis as any).__RPS_BACKEND_HOST__ || defaultBackendHost;

// Backend port: only use a specific port if in development (localhost)
// In production (Onrender), don't specify a port - use the default HTTPS port (443)
const backendPort = runtimeHost === 'localhost' ? (runtimeWindow?.location.port || '3000') : '';

const backendBaseUrl = backendPort ? `${backendProtocol}://${backendHost}:${backendPort}` : `${backendProtocol}://${backendHost}`;

export const environment = {
  production: false,
  socketUrl: backendBaseUrl,
  apiUrl: `${backendBaseUrl}/api`,
};
