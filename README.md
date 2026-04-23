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
3. npm run start:lan

Concede permisos de camara al navegador para que funcione la deteccion de gestos.

### Jugar en la misma red local (LAN)
1. Levanta backend y frontend en el equipo anfitrion:
	- Backend: `cd server && npm run dev`
	- Frontend: `cd client && npm run start:lan`
2. Obtiene la IP local del anfitrion (por ejemplo, `192.168.1.50`).
3. Desde el segundo dispositivo abre: `http://IP_DEL_ANFITRION:4200`

Nota: el cliente detecta automaticamente el host de la URL y usa ese mismo host para REST y Socket.IO en el puerto 3000.

Si pruebas en HTTPS (npm run start:lan:ssl), el backend tambien debe estar servido en HTTPS para evitar bloqueos del navegador por mixed content.
