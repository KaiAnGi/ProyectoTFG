# Integracion Front + Back (Angular + Node/Socket.IO)

## Objetivo
Unificar cliente y servidor para que el flujo real sea:
1. Registro/login contra API REST.
2. Creacion y union de salas por Socket.IO.
3. Inicio de partida, envio de jugadas y recepcion de resultados en tiempo real.
4. Actualizacion de ranking en vivo tras finalizar partidas.

## Cambios aplicados

### 1) Cliente: configuracion base
- Se habilito HttpClient global para permitir llamadas REST desde servicios standalone.
- Archivo: client/src/app/app.config.ts

### 2) Cliente: autenticacion real contra backend
- Servicio de autenticacion conectado a:
  - POST /api/auth/register
  - POST /api/auth/login
- Persistencia de sesion:
  - Usuario en localStorage (clave rps_user)
  - Token JWT en localStorage (clave rps_token)
- Normalizacion de datos legacy de localStorage para no romper sesiones antiguas.
- Archivo: client/src/app/services/auth.ts

### 3) Cliente: pantallas de login y registro
- Login:
  - Dejo de simular localStorage.
  - Consume backend real y muestra errores devueltos por API.
- Registro:
  - Crea usuario por API.
  - Hace login automatico al registrarse para entrar al menu sin pasos extra.
  - Muestra errores de backend y estado de carga.
- Archivos:
  - client/src/app/features/login/login.ts
  - client/src/app/features/login/login.html
  - client/src/app/features/register/register.ts
  - client/src/app/features/register/register.html

### 4) Cliente: estado de juego sincronizado con socket
- Se extendio el modelo de estado para reflejar datos reales del servidor:
  - Rol del jugador (player1/player2)
  - Vidas propias y del rival
  - maxRounds inicial en 3 por defecto (alineado con backend)
- El servicio de juego ahora:
  - Inicializa listeners una sola vez.
  - Mapea correctamente room_created, room_joined, start_round, round_result, match_finished y error.
  - Soporta crear sala con maxRounds 3/5/9.
  - Traduce resultados server-side (player1/player2/tie) a la perspectiva del cliente (win/lose/tie).
- Archivos:
  - client/src/app/models/game-state.model.ts
  - client/src/app/services/game.service.ts

### 5) Cliente: flujo de salas y partida
- Crear sala:
  - Emite create_room con username y maxRounds.
- Unirse a sala:
  - Emite join_room usando roomCode como roomId real.
- Waiting room:
  - Se alimenta del estado real del juego.
  - Navega automaticamente a /game cuando start_round llega por socket.
  - Limpia conexion al salir.
- Game:
  - Pinta codigo de sala, rondas, vidas y gestos desde estado real.
  - Limpia sesion de juego al salir.
- Detector de gestos:
  - Dejo de mutar estado interno de forma privada.
  - Ahora envia jugada real al backend via gameService.makeChoice().
  - Evita spam de emisiones repetidas del mismo gesto.
- Archivos:
  - client/src/app/features/create-room/create-room.component.ts
  - client/src/app/features/join-room/join-room.component.ts
  - client/src/app/features/waiting-room/waiting-room.component.ts
  - client/src/app/features/game/game.component.ts
  - client/src/app/features/game/game-components/gesture-detector/gesture-detector.component.ts

### 6) Cliente: ranking en tiempo real
- RankingService ahora se conecta a socketUrl correcto para escuchar leaderboard:update.
- Manejo de error en carga inicial de ranking.
- Archivo: client/src/app/services/ranking.service.ts

### 7) Servidor: emision de leaderboard:update
- Se agrego emision de leaderboard:update al finalizar partidas, tanto en cierre normal como por retiro.
- Se actualizo el contrato tipado de Socket.IO para incluir el evento.
- Archivos:
  - server/sockets/gameHandler.ts
  - server/types/socket-types.ts

### 8) Servidor: empaquetado ejecutable
- Se creo package.json en server para instalar dependencias y ejecutar scripts de desarrollo/tests.
- Archivo: server/package.json

## Contrato de integracion usado

### REST
- POST /api/auth/register
  - body: { username, email, password, confirmPassword }
- POST /api/auth/login
  - body: { email, password }
- GET /api/ranking?limit=50
- GET /api/ranking/:playerName

### Socket cliente -> servidor
- create_room { username, maxRounds }
- join_room { roomId, username }
- player_choice { roomId, choice }

### Socket servidor -> cliente
- room_created { roomId, message, maxRounds }
- room_joined { roomId, players, maxRounds }
- start_round { roundNumber }
- round_result { playerChoice, opponentChoice, result, playerScore, opponentScore, player1Lives, player2Lives, roundEnded, roundNumber, isFinished }
- match_finished { winner, finalScore }
- leaderboard:update [ ...ranking ]

## Como levantar el proyecto integrado

### 1. Backend
Desde la carpeta server:
1. npm install
2. npm run dev

Variables minimas esperadas en server/.env:
- PORT=3000
- MONGODB_URI=mongodb://localhost:27017/piedrapapeltijera
- NODE_ENV=development
- JWT_SECRET=tu_clave_jwt

### 2. Frontend
Desde la carpeta client:
1. npm install
2. ng serve --ssl true --open

El cliente ya apunta a:
- API: http://localhost:3000/api
- Socket: http://localhost:3000

## Validacion realizada
- Se valido tipado y errores de archivos modificados con analisis del editor.
- Build completa de Angular no pudo ejecutarse porque faltan dependencias instaladas en client/node_modules en este entorno.
- Para validacion final local: ejecutar npm install en client y server, luego correr build/tests.

## Riesgos abiertos y siguientes pasos recomendados
1. Seguridad de token:
   - El token ya se guarda, pero aun no se envia en cabeceras Authorization en llamadas protegidas (si se agregan endpoints privados).
2. Sala de espera:
   - El backend no maneja un estado de ready explicito; el inicio real se produce al entrar el segundo jugador.
3. roomName/password:
   - La UI recoge roomName/password pero el contrato socket actual no los usa todavia. Si se quiere soporte real, hay que extender server/sockets/gameRoom.ts y validar en eventos create_room/join_room.
