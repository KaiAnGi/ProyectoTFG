const runtimeWindow = typeof window !== 'undefined' ? window : null;
const runtimeHost = runtimeWindow?.location.hostname || 'localhost';
const isLocalhost = runtimeHost === 'localhost' || runtimeHost === '127.0.0.1';

const backendProtocol =
  (globalThis as any).RPS_BACKEND_PROTOCOL || (isLocalhost ? 'http' : 'https');

const backendHost =
  (globalThis as any).RPS_BACKEND_HOST || (isLocalhost ? 'localhost' : 'server-567m.onrender.com');

const backendPort = (globalThis as any).RPS_BACKEND_PORT || (isLocalhost ? '3000' : '');

const backendBaseUrl = backendPort ? `${backendProtocol}://${backendHost}:${backendPort}` : `${backendProtocol}://${backendHost}`;

export const environment = {
  production: !isLocalhost,
  socketUrl: backendBaseUrl,
  apiUrl: `${backendBaseUrl}/api`,
};
