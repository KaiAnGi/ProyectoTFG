const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export const environment = {
  production: typeof window !== 'undefined' ? window.location.hostname !== 'localhost' : false,
  socketUrl: origin,
  apiUrl: `${origin}/api`,
};
