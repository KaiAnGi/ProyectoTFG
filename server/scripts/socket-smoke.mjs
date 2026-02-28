import { io } from "socket.io-client";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
let roomId = null;

/*
  Smoke test de juego por WebSocket (flujo completo de partida).

  Qué valida:
  - Conexión de dos clientes (`alice` y `bob`) al servidor Socket.IO.
  - Creación de sala, unión de segundo jugador e inicio de rondas.
  - Emisión y recepción de elecciones por ronda (`player_choice`).
  - Coherencia de `round_result`: ganador, elecciones y marcador consecutivo.
  - Flujo de continuidad (`rematch`) y cierre de partida (`retire` ->
   `match_finished`).

  Cómo funciona:
  1) Crea dos sockets cliente con transportes websocket/polling.
  2) `alice` crea sala y `bob` se une cuando recibe `room_created`.
  3) En cada `start_round`, ambos envían jugada predefinida con pequeño retardo
    aleatorio para simular latencia real.
  4) Al recibir `round_result` en `alice`, el script calcula localmente el
    resultado esperado y verifica:
    - `result`,
    - `playerScore` y `opponentScore` (racha de victorias),
    - `playerChoice` y `opponentChoice`.
    Si algo no coincide, falla inmediatamente.
  5) Tras cada ronda usa `waiting_action`: hasta 10 rondas pide `rematch`, y
    luego `alice` envía `retire` para forzar fin controlado del match.
  6) Incluye timeout global configurable (`SMOKE_TIMEOUT_MS`, por defecto
    20s) para evitar bloqueos infinitos.

  Criterio de éxito:
  - Se completa el flujo entero sin inconsistencias y llega `match_finished`.
*/

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const failTimer = setTimeout(() => {
  console.error("Socket smoke test failed: timeout");
  process.exit(1);
}, timeoutMs);

function cleanupAndExit(code) {
  clearTimeout(failTimer);
  process.exit(code);
}

const alice = io(baseUrl, { transports: ["websocket", "polling"] });
const bob = io(baseUrl, { transports: ["websocket", "polling"] });

const aliceChoices = [
  "rock",
  "paper",
  "scissors",
  "rock",
  "paper",
  "scissors",
  "rock",
  "paper",
  "scissors",
  "rock",
];

const bobChoices = [
  "scissors",
  "rock",
  "paper",
  "paper",
  "rock",
  "scissors",
  "scissors",
  "rock",
  "paper",
  "paper",
];

let roundsPlayed = 0;
let expectedAliceScore = 0;
let expectedBobScore = 0;
let lastRoundNumber = 0;

function getChoice(choices, roundNumber) {
  return choices[roundNumber - 1] || choices[choices.length - 1];
}

function calculateWinner(aliceChoice, bobChoice) {
  if (aliceChoice === bobChoice) return "tie";
  if (
    (aliceChoice === "rock" && bobChoice === "scissors") ||
    (aliceChoice === "paper" && bobChoice === "rock") ||
    (aliceChoice === "scissors" && bobChoice === "paper")
  ) {
    return "player1";
  }
  return "player2";
}

alice.on("connect", () => {
  console.log("alice connected", alice.id);
  alice.emit("create_room", { username: "alice" });
});
alice.on("connect_error", (err) => {
  console.error("alice connect_error", err.message);
  cleanupAndExit(1);
});

bob.on("connect", () => {
  console.log("bob connected", bob.id);
});

bob.on("connect_error", (err) => {
  console.error("bob connect_error", err.message);
  cleanupAndExit(1);
});

alice.on("room_created", (data) => {
  roomId = data.roomId;
  console.log("room_created", data);
  bob.emit("join_room", { roomId, username: "bob" });
});

alice.on("room_joined", (data) => console.log("alice room_joined", data));
bob.on("room_joined", (data) => console.log("bob room_joined", data));

alice.on("start_round", (data) => {
  console.log("alice start_round", data);
  lastRoundNumber = data.roundNumber;
  const choice = getChoice(aliceChoices, data.roundNumber);
  const delayMs = 100 + Math.floor(Math.random() * 200);
  setTimeout(() => {
    alice.emit("player_choice", { roomId, choice });
  }, delayMs);
});

bob.on("start_round", (data) => {
  console.log("bob start_round", data);
  const choice = getChoice(bobChoices, data.roundNumber);
  const delayMs = 100 + Math.floor(Math.random() * 200);
  setTimeout(() => {
    bob.emit("player_choice", { roomId, choice });
  }, delayMs);
});

alice.on("round_result", (data) => {
  roundsPlayed += 1;
  const roundNumber = lastRoundNumber || roundsPlayed;
  const aliceChoice = getChoice(aliceChoices, roundNumber);
  const bobChoice = getChoice(bobChoices, roundNumber);
  const expectedResult = calculateWinner(aliceChoice, bobChoice);

  if (expectedResult === "player1") {
    expectedAliceScore += 1;
    expectedBobScore = 0;
  } else if (expectedResult === "player2") {
    expectedBobScore += 1;
    expectedAliceScore = 0;
  }

  console.log("alice round_result", data, {
    roundNumber,
    aliceChoice,
    bobChoice,
    expectedResult,
    expectedConsecutiveWins: { expectedAliceScore, expectedBobScore },
  });

  if (
    data.result !== expectedResult ||
    data.playerScore !== expectedAliceScore ||
    data.opponentScore !== expectedBobScore ||
    data.playerChoice !== aliceChoice ||
    data.opponentChoice !== bobChoice
  ) {
    console.error("round_result mismatch", {
      received: data,
      expectedResult,
      expectedConsecutiveWins: { expectedAliceScore, expectedBobScore },
      expectedChoices: { aliceChoice, bobChoice },
      roundNumber,
      aliceChoice,
      bobChoice,
    });
    cleanupAndExit(1);
  }
});

bob.on("round_result", (data) => console.log("bob round_result", data));

alice.on("waiting_action", (data) => {
  console.log("alice waiting_action", data);
  const action = roundsPlayed < 10 ? "rematch" : "retire";
  console.log("alice action:", action);
  alice.emit("player_action", { roomId, action });
});

bob.on("waiting_action", (data) => {
  console.log("bob waiting_action", data);
  bob.emit("player_action", { roomId, action: "rematch" });
});

alice.on("match_finished", (data) => {
  console.log("alice match_finished", data);
  cleanupAndExit(0);
});

bob.on("match_finished", (data) => console.log("bob match_finished", data));

alice.on("error", (e) => {
  console.error("alice error", e);
  cleanupAndExit(1);
});

bob.on("error", (e) => {
  console.error("bob error", e);
  cleanupAndExit(1);
});