# Proyecto TFG - Cliente + Servidor Integrados

## Estado actual
El repositorio ya integra frontend y backend en un flujo unico:
- Auth por API REST (register/login)
- Juego por Socket.IO (crear sala, unir sala, rondas y resultados)
- Ranking con actualizacion en tiempo real al terminar partidas

Documentacion tecnica completa:
- docs/INTEGRACION_FRONT_BACK.md

## Arranque rapido

### Backend (server)
1. cd server
2. npm install
3. npm run dev

Variables minimas en server/.env:
- PORT=3000
- MONGODB_URI=mongodb://localhost:27017/piedrapapeltijera
- NODE_ENV=development
- JWT_SECRET=tu_clave_jwt

### Frontend (client)
1. cd client
2. npm install
3. ng serve --ssl true --open

Concede permisos de camara al navegador para que funcione la deteccion de gestos.
