import { io } from "socket.io-client";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
let roomId = null;
let maxRounds = 3;

/*
  Smoke test de juego por WebSocket (flujo completo de partida).

  Qué valida:
  - Conexión de dos clientes (`alice` y `bob`) al servidor Socket.IO.
  - Creación y unión a sala con maxRounds.
  - Cada ronda: jugadores tienen 3 vidas, pierden 1 por derrota.
  - Cuando alguien llega a 0 vidas: ronda cierra automáticamente, ganador suma 1 punto de ronda.
  - Siguiente ronda empieza automáticamente vía `start_round` (sin `waiting_action`).
  - Partida termina cuando se alcanza `maxRounds` rondas y cierra última ronda.
  - `round_result` incluye `roundEnded`, `player1Lives`, `player2Lives`.

  Cómo funciona:
  1) Dos clientes con transporte websocket/polling.
  2) Alice crea sala, Bob se une.
  3) En cada ronda (empezando con 3 vidas c/u):
     - Ambos envían elección.
     - Servidor calcula ganador, pierde 1 vida quien pierde.
     - Si alguien llega a 0: ronda cierra, punto al ganador.
  4) Siguiente ronda arranca automáticamente (3 vidas de nuevo).
  5) Al cerrar ronda N (N >= maxRounds): partida termina.

  Criterio de éxito:
  - Vidas se decrementan correctamente.
  - roundEnded es true cuando alguien llega a 0 vidas.
  - Transición de ronda es automática (sin acciones manuales).
  - match_finished se recibe tras cerrar última ronda.
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

let expectedAliceRoundsWon = 0;
let expectedBobRoundsWon = 0;
let lastRoundNumber = 0;
let matchFinished = false;
let aliceLives = 3;
let bobLives = 3;
let duelCount = 0;

function getChoice(choices, duelIndex) {
  return choices[duelIndex] || choices[choices.length - 1];
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

function calculateIsFinished(roundNumber, roundEnded) {
  return roundEnded && roundNumber >= maxRounds;
}

alice.on("connect", () => {
  console.log("alice connected", alice.id);
  alice.emit("create_room", { username: "alice", maxRounds });
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
  if (data.maxRounds !== maxRounds) {
    console.error(
      `room_created mismatch: expected maxRounds=${maxRounds}, got ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
  bob.emit("join_room", { roomId, username: "bob" });
});

alice.on("room_joined", (data) => {
  console.log("alice room_joined", data);
  if (data.maxRounds !== maxRounds) {
    console.error(
      `alice room_joined mismatch: expected maxRounds=${maxRounds}, got ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
});

bob.on("room_joined", (data) => {
  console.log("bob room_joined", data);
  if (data.maxRounds !== maxRounds) {
    console.error(
      `bob room_joined mismatch: expected maxRounds=${maxRounds}, got ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
});

alice.on("start_round", (data) => {
  console.log("alice start_round", data);
  lastRoundNumber = data.roundNumber;
  const choice = getChoice(aliceChoices, duelCount);
  const delayMs = 100 + Math.floor(Math.random() * 200);
  setTimeout(() => {
    alice.emit("player_choice", { roomId, choice });
  }, delayMs);
});

bob.on("start_round", (data) => {
  console.log("bob start_round", data);
  const choice = getChoice(bobChoices, duelCount);
  const delayMs = 100 + Math.floor(Math.random() * 200);
  setTimeout(() => {
    bob.emit("player_choice", { roomId, choice });
  }, delayMs);
});

alice.on("round_result", (data) => {
  const roundNumber = data.roundNumber || lastRoundNumber || 1;
  const aliceChoice = getChoice(aliceChoices, duelCount);
  const bobChoice = getChoice(bobChoices, duelCount);
  const expectedResult = calculateWinner(aliceChoice, bobChoice);

  if (expectedResult === "player1") {
    bobLives -= 1;
  } else if (expectedResult === "player2") {
    aliceLives -= 1;
  }

  let expectedRoundEnded = false;
  if (aliceLives === 0 || bobLives === 0) {
    expectedRoundEnded = true;
    if (aliceLives > bobLives) {
      expectedAliceRoundsWon += 1;
    } else if (bobLives > aliceLives) {
      expectedBobRoundsWon += 1;
    }
    aliceLives = 3;
    bobLives = 3;
  }

  const expectedIsFinished = calculateIsFinished(roundNumber, expectedRoundEnded);
  duelCount += 1;
  console.log("alice round_result", data, {
    roundNumber,
    aliceChoice,
    bobChoice,
    expectedResult,
    expectedRoundsWon: { expectedAliceRoundsWon, expectedBobRoundsWon },
    expectedRoundEnded,
    expectedIsFinished,
  });

  if (
    data.result !== expectedResult ||
    data.playerScore !== expectedAliceRoundsWon ||
    data.opponentScore !== expectedBobRoundsWon ||
    data.playerChoice !== aliceChoice ||
    data.opponentChoice !== bobChoice ||
    data.roundEnded !== expectedRoundEnded ||
    data.isFinished !== expectedIsFinished
  ) {
    console.error("round_result mismatch", {
      received: data,
      expectedResult,
      expectedRoundsWon: { expectedAliceRoundsWon, expectedBobRoundsWon },
      expectedChoices: { aliceChoice, bobChoice },
      expectedRoundEnded,
      expectedIsFinished,
      roundNumber,
    });
    cleanupAndExit(1);
  }

  if (data.isFinished) {
    matchFinished = true;
  }
});

bob.on("round_result", (data) => {
  console.log("bob round_result", data);
  if (data.isFinished) {
    matchFinished = true;
  }
});

alice.on("waiting_action", (data) => {
  console.error("ERROR: No se esperaba waiting_action en nuevo flujo", data);
  cleanupAndExit(1);
});

bob.on("waiting_action", (data) => {
  console.error("ERROR: No se esperaba waiting_action en nuevo flujo", data);
  cleanupAndExit(1);
});

alice.on("match_finished", (data) => {
  console.log("alice match_finished", data);
  if (!data.winner || !data.finalScore) {
    console.error("match_finished missing required fields", data);
    cleanupAndExit(1);
  }
  if (data.finalScore.player1 !== expectedAliceRoundsWon || data.finalScore.player2 !== expectedBobRoundsWon) {
    console.error("match_finished score mismatch", {
      expected: { player1: expectedAliceRoundsWon, player2: expectedBobRoundsWon },
      received: data.finalScore,
    });
    cleanupAndExit(1);
  }
  setTimeout(() => {
    cleanupAndExit(0);
  }, 500);
});

bob.on("match_finished", (data) => {
  console.log("bob match_finished", data);
  if (!data.winner || !data.finalScore) {
    console.error("bob match_finished missing required fields", data);
    cleanupAndExit(1);
  }
});

alice.on("error", (e) => {
  console.error("alice error", e);
  cleanupAndExit(1);
});

bob.on("error", (e) => {
  console.error("bob error", e);
  cleanupAndExit(1);
});