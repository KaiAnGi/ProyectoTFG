const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  socketUrl: `http://${host}:3000`,
  apiUrl: `http://${host}:3000/api`,
};
