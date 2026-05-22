# RPS — Rock Paper Scissors

## Hecho por: Kai, Diego y Karen
## Ciclo formativo de Grado Superior en Desarrollo de Aplicaciones Web (Curso 2025-2026)
## Alonso de Avellaneda

![Angular](https://img.shields.io/badge/Angular-20-red?style=flat-square&logo=angular)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=flat-square&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-black?style=flat-square&logo=socket.io)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-blue?style=flat-square)
![Render](https://img.shields.io/badge/Deployed-Render-purple?style=flat-square&logo=render)

Aplicación web multijugador 1vs1 en tiempo real de Piedra, Papel o Tijera con videollamada WebRTC, sistema de apuestas con moneda virtual, compras integradas con PayPal, detección de gestos por cámara, sistema de amigos y chat, y ranking competitivo.

**[Jugar ahora](https://cliente-2a5q.onrender.com/)**

> Concede permisos de cámara al navegador al entrar.

---

## 1. Introducción y justificación

### 1.1 Descripción de la aplicación

RPS es un juego multijugador en tiempo real donde dos jugadores se enfrentan en partidas al mejor de 3, 5 o 9 rondas. La aplicación combina:

- **Detección de gestos por cámara** usando MediaPipe Hands. El jugador elige piedra, papel o tijera mostrando la mano frente a la cámara, sin necesidad de clics ni botones.
- **Videollamada WebRTC** entre los jugadores durante las rondas, con privacidad automática (la cámara del oponente se oculta durante la ronda activa y se muestra al revelar resultados).
- **Sistema de apuestas** con moneda virtual (*shines*). Los jugadores pueden apostar antes de la partida; el ganador se lleva el bote.
- **Tienda integrada con PayPal** para comprar *shines* (packs de 100, 500 y 1000).
- **Sistema de amigos y chat** con notificaciones en tiempo real.
- **Ranking global** con leaderboard de victorias totales por jugador.

### 1.2 Motivación

Queríamos crear un juego online de partidas rápidas con un enfoque distinto: usar la webcam para la detección de gestos y añadir videollamada para recuperar la interacción social entre jugadores. La detección por cámara añade inmersión y ver la reacción del oponente al ganar o perder hace la experiencia más personal y divertida.

---

## 2. Análisis y diseño del proyecto

### 2.1 Arquitectura web

La aplicación sigue una arquitectura SPA con un backend API REST + Socket.IO.

- **Frontend:** Angular 20 (components standalone). Comunicación en tiempo real con Socket.IO.
- **Backend:** Node.js + Express + Socket.IO. API REST para autenticación, ranking, amigos y PayPal; sockets para estado del juego, salas y señalización WebRTC.
- **Persistencia:** MongoDB Atlas mediante Mongoose.

### 2.2 Organización general de la aplicación

<img width="1024" height="682" alt="6ff1fa6e-a349-418d-b4a4-8ccdadda13f9" src="https://github.com/user-attachments/assets/8e986eb0-adc4-4265-983e-56bbed04ede3" />

### 2.3 Tecnologías y herramientas

**Frontend**

| Tecnología | Uso |
|---|---|
| Angular 20 | Framework principal (standalone components) |
| TypeScript | Tipado estático |
| RxJS | Gestión de estado reactivo |
| Socket.IO Client | Comunicación en tiempo real |
| MediaPipe Hands | Detección de gestos por cámara |
| MediaPipe Camera Utils | Gestión de captura de cámara |
| WebRTC API | Videollamada peer-to-peer |
| HTML5 Canvas | Renderizado de landmarks de mano |

**Backend**

| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor HTTP y API REST |
| Socket.IO | Eventos de juego en tiempo real |
| TypeScript (ESM) | Tipado del servidor |
| Mongoose | ODM para MongoDB |
| bcrypt | Hashing de contraseñas |
| jsonwebtoken | Autenticación JWT |

**Base de datos**

| Tecnología | Uso |
|---|---|
| MongoDB | Base de datos NoSQL |

**Integración y pruebas**

| Tecnología | Uso |
|---|---|
| Scripts smoke tests | Pruebas automatizadas de registro, login, sockets y partidas completas (en `/server/scripts/`) |

**Despliegue y hosting**

| Servicio | Uso |
|---|---|
| MongoDB Atlas | Cluster compartido gratuito |
| Render | Despliegue frontend + backend |

### 2.4 Análisis de usuarios

- **Usuario registrado:** cuenta con email y contraseña; acceso a todas las funcionalidades.

### 2.5 Requisitos funcionales y no funcionales

**Funcionales**
- Registro e inicio de sesión con JWT
- Crear y unirse a salas (rondas 3, 5 o 9)
- Selección de avatar en sala de espera
- Ambos jugadores deben marcar READY para empezar
- Sistema de apuestas con confirmación y visualización de saldo
- Rondas temporizadas con cuenta atrás
- Detección de gestos por MediaPipe
- Videollamada WebRTC entre jugadores
- Liquidación de apuestas y actualización de saldo automática
- Compra de *shines* vía PayPal (packs: 100, 500, 1000)
- Reembolso de *shines* mediante PayPal Payouts
- Sistema de amigos y chat en tiempo real
- Leaderboard global
- Sistema de revanchas

**No funcionales**
- Detección de gestos 100% en cliente (sin subir vídeo al servidor)
- Videollamada peer-to-peer (el servidor solo hace señalización)
- Contraseñas hasheadas con bcrypt
- Rutas sensibles protegidas por JWT

### 2.6 Aspectos técnicos y de calidad

**Rendimiento**
- Detección de gestos en cliente, sin latencia de red
- WebRTC P2P para reducir latencia en la videollamada
- Temporizador de ronda gestionado por servidor (ticks cada 1s)

**Usabilidad**
- Interfaz oscura con tipografía dedicada
- Feedback visual con bordes, animaciones y colores por resultado
- Copia rápida del código de sala con un clic

**Seguridad**
- JWT con expiración de 7 días (`JWT_SECRET` en `.env`)
- bcrypt en `pre("save")` del modelo User
- Validación atómica de apuestas con `$inc` + `$gte` (no se puede apostar más de lo que tienes)

### 2.7 Estructura de navegación

**Frontend**
<img width="1024" height="559" alt="113222a8-e84b-4988-add0-796cfb95ded3" src="https://github.com/user-attachments/assets/99239de2-d3df-4556-86d8-cfe692b260c1" />

**Backend**
<img width="1024" height="559" alt="950a7938-dc72-436f-b6e5-7147fe00ef2e" src="https://github.com/user-attachments/assets/b7a8cd17-50ae-4d37-9623-b9797db5444a" />

---

## 3. Modelo de datos

### `users`
```json
{
  "_id": "ObjectId",
  "username": "string (único, min 3 chars)",
  "email": "string (único)",
  "password": "string (bcrypt hashed)",
  "bones": "number (default: 0)",
  "friends": ["string (usernames)"],
  "paypalVaultId": "string | null",
  "paypalEmail": "string | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `leaderboards`
```json
{
  "_id": "ObjectId",
  "playerName": "string (único, indexed)",
  "matchVictories": "number",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `friendrequests`
```json
{
  "_id": "ObjectId",
  "from": "string (username)",
  "to": "string (username)",
  "status": "string ('pending' | 'accepted' | 'rejected')",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `chatmessages`
```json
{
  "_id": "ObjectId",
  "from": "string (username)",
  "to": "string (username)",
  "message": "string (max 500 chars)",
  "read": "boolean (default: false)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 4. Conclusiones

### 4.1 Resultados obtenidos

- Juego en tiempo real con detección de gestos integrada y funcional
- Videollamada P2P con privacidad automática durante rondas
- Sistema de apuestas con liquidación automática al terminar cada partida
- Pasarela PayPal funcional con vaulting para compras recurrentes
- Sistema de amigos, chat y leaderboard global
- Despliegue en producción en Render con HTTPS y MongoDB Atlas

### 4.2 Retos encontrados y soluciones

- **Leaderboard visible sin login:** el botón del leaderboard aparecía sin haber iniciado sesión. Se añadió `isLoggedIn &&` al `*ngIf` del HUD y se forzó la re-evaluación con `ChangeDetectorRef`.
- **401 en petición de amigos:** las llamadas a la API no enviaban el token JWT. Se añadió el interceptor en `app.config.ts` con `provideHttpClient(withInterceptors([authInterceptor]))`.
- **Saldo de shines sin actualizar tras apuesta:** el cliente no refrescaba los bones al terminar la partida. Se incluyeron los `bones` actualizados en el payload del evento `bet_resolved` que emite el servidor.
- **Error "Sala llena o no existe":** al unirse a una sala recién creada, el backend a veces aún no la tenía registrada. Se ajustó la sincronización entre `create_room` y `join_room`.
- **Resultado de apuesta sin color visible:** el overlay de victoria/derrota mostraba texto negro sobre fondo oscuro. Se corrigieron los colores en `game.component.css`.
- **Despliegue en Render:** todas las llamadas apuntaban a `localhost`. Se adaptaron las URLs al entorno de Render y se configuraron las variables de entorno privadas en el panel de Render.

### 4.3 Aprendizajes y mejoras futuras

Durante el proyecto aprendimos bastante sobre integración WebRTC + Socket.IO, uso de MediaPipe Hands en cliente y operaciones atómicas en MongoDB, cosas que no habíamos tocado antes y que al final acabaron funcionando.

Mejoras que añadiríamos con más tiempo:
- Soporte para espectadores en partidas
- Historial de partidas por jugador
- Poder deshacer la apuesta antes de confirmarla
- Gestos adicionales (lagarto, Spock)
- Notificación push al recibir mensajes o solicitudes

### 4.4 Viabilidad del cronograma

El proyecto fue viable dentro del tiempo disponible gracias a una planificación por fases. En una primera fase se desarrolló la base del sistema: diseño de la aplicación, detección de gestos y lógica de autenticación y salas. Después se integró todo y solucionamos algunos errores de llamadas entre front y back. A continuación añadimos la sincronización por Socket.IO y probamos la viabilidad de desplegar la base de datos a MongoDB Atlas con éxito. Finalmente se abordaron los módulos más complejos: videollamada WebRTC, control de volumen, sistema de amigos, chat, integración con PayPal, sistema de avatares seleccionables en la waiting-room, sistema de apuestas y retirada de shines a paypal. Algunas funcionalidades requirieron más tiempo del estimado, ya fuese por incidencias en su implementación o por no comprender correctamente cómo funcionaban y cómo queríamos incorporarlas al proyecto.

### 4.5 Seguimiento de la planificación

Durante el desarrollo se realizó un seguimiento continuo de la planificación inicial, revisando el estado de cada módulo y ajustando el orden de implementación cuando fue necesario. Primero se priorizaron las funcionalidades críticas para asegurar un producto funcional cuanto antes. Una vez desarrollado lo principal, se incorporaron las mejoras de experiencia de usuario y los módulos secundarios. El seguimiento fue realizado a través de un tablero **Kanban** bajo el cual ibamos actualizando ideas, sus estados de ejecucion y quien llevaba esa parte. Esto, junto con pruebas constantes y un uso ordenado de git, permitió comprobar que cada avance encajaba con el sistema y que las nuevas funcionalidades no rompían las que ya se habían implementado. En conjunto, la planificación se mantuvo bastante alineada con el desarrollo real, aunque con ajustes puntuales para resolver dependencias técnicas.

### 4.6 Desviaciones respecto a la planificación inicial

Las principales desviaciones vinieron de la sincronización por Socket.IO, el control del estado de sala, la gestión de cámaras y la comunicación en tiempo real, que requirieron más iteraciones de las previstas. También se dedicó tiempo extra a adaptar el despliegue a Render y corregir problemas de configuración de URLs y comunicación entre servicios.

---

## 5. Bibliografía y fuentes

- [Angular](https://angular.dev)
- [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [WebRTC — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [PayPal API Docs](https://developer.paypal.com/docs/api/orders/v2/)
- [Render Docs](https://render.com/docs)
- [StackOverflow](https://stackoverflow.com/questions)
- YouTube
- GitHub Copilot

---

## 6. Anexos

### 6.1 Guía de instalación y despliegue

Acceso directo: [https://cliente-2a5q.onrender.com/](https://cliente-2a5q.onrender.com/)

> Concede permisos de cámara al navegador.

**Puede que el firewall de la red del centro bloquee la direccion del MongoDB Atlas, en tal caso funcionará desde cualquier red privada.**


### 6.2 Estudio de viabilidad económica

| Concepto | Coste |
|---|---|
| Hosting front + back (Render free tier) | 0 €/mes |
| MongoDB Atlas (cluster compartido gratuito) | 0 €/mes |
| Dominio personalizado (opcional) | ~12 €/año |
| Comisiones PayPal | ~3.9% + 0.35 € por transacción |

ROI potencial: ingresos por venta de shines. Cada partida con apuesta incentiva la compra de más shines al perderlos. Los packs tienen margen del 100% al ser moneda virtual sin coste de producción.

### 6.3 Consideraciones legales

- **PayPal:** se usa el entorno Sandbox para desarrollo. En producción requeriría cuenta PayPal Business verificada.
- **GDPR:** la app almacena email y nombre de usuario. Habría que añadir política de privacidad, consentimiento y opción de borrado de datos.
- **MediaPipe:** librería open-source bajo licencia Apache 2.0.
- **Assets:** los recursos gráficos (personajes, logo, fondos) son originales o de libre uso.

### 6.4 Manual rápido

1. Regístrate en `/auth/register`
2. En el menú principal, crea una sala eligiendo 3, 5 o 9 rondas, o únete con un código
3. En la sala de espera: selecciona tu avatar con las flechas, activa la cámara y pulsa `READY`
4. Establece tu apuesta y pulsa `SET BET`
5. Pulsa `START GAME` cuando ambos jugadores estén listos
6. Durante la partida:
   - Muestra tu mano a la cámara: puño cerrado = piedra, mano abierta = papel, dos dedos = tijera
   - La cámara del oponente se ocultará durante la ronda
   - Al revelar resultados, la cámara del ganador se ilumina con borde dorado
   - Al terminar, se muestra el resultado final y se liquida la apuesta automáticamente
7. Compra más shines desde el icono del carrito en la interfaz principal
