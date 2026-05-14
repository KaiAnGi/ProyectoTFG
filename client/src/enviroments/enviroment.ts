const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

// Allow overriding via a global injected config (useful for static hosts)
declare global {
  interface Window {
    __env?: { API_URL?: string; SOCKET_URL?: string; FRONTEND_URL?: string };
  }
}

const injectedApi = typeof window !== 'undefined' ? window.__env?.API_URL : undefined;
const injectedSocket = typeof window !== 'undefined' ? window.__env?.SOCKET_URL : undefined;
const injectedFrontend = typeof window !== 'undefined' ? window.__env?.FRONTEND_URL : undefined;

const apiBase = injectedApi || injectedFrontend || origin;
const socketBase = injectedSocket || injectedFrontend || origin;

export const environment = {
  production: typeof window !== 'undefined' ? window.location.hostname !== 'localhost' : false,
  socketUrl: socketBase,
  apiUrl: `${apiBase}/api`,
};

export default environment;
