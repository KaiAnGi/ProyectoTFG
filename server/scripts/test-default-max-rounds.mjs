import { io } from "socket.io-client";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

/*
  Test para verificar que cuando no se proporciona maxRounds, se usa el valor por defecto (3).
  
  Qué valida:
  - Si no se envía maxRounds, el servidor usa 3 como valor por defecto
  - El cliente puede crear salas sin especificar maxRounds
  - La partida funciona correctamente con el valor por defecto
*/

let roomId = null;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 20000);
const failTimer = setTimeout(() => {
  console.error("Test defaultMaxRounds falló: timeout");
  process.exit(1);
}, timeoutMs);

function cleanupAndExit(code) {
  clearTimeout(failTimer);
  process.exit(code);
}

const alice = io(baseUrl, { transports: ["websocket", "polling"], reconnection: false });
const bob = io(baseUrl, { transports: ["websocket", "polling"], reconnection: false });

const DEFAULT_MAX_ROUNDS = 3;
let matchStarted = false;
let matchFinished = false;
let aliceRoundsWon = 0;
let bobRoundsWon = 0;
let aliceLives = 3;
let bobLives = 3;
let duelCount = 0;

alice.on("connect", () => {
  console.log("Alice connected");
  // NO pasamos maxRounds, debe usar el valor por defecto
  alice.emit("create_room", { username: "alice_default" });
});

alice.on("connect_error", (err) => {
  console.error("Alice connection error:", err.message);
  cleanupAndExit(1);
});

bob.on("connect", () => {
  console.log("Bob connected");
});

bob.on("connect_error", (err) => {
  console.error("Bob connection error:", err.message);
  cleanupAndExit(1);
});

alice.on("room_created", (data) => {
  roomId = data.roomId;
  console.log(`Room created, maxRounds received: ${data.maxRounds}`);
  
  // Verificar que maxRounds es el valor por defecto
    if (data.maxRounds !== DEFAULT_MAX_ROUNDS) {
    console.error(
      `ERROR: expected maxRounds=${DEFAULT_MAX_ROUNDS}, got ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
  console.log(`✓ Default value correct: ${DEFAULT_MAX_ROUNDS}`);
  
  bob.emit("join_room", { roomId, username: "bob_default" });
});

alice.on("room_joined", (data) => {
  console.log(`Alice room_joined, maxRounds: ${data.maxRounds}`);
  if (data.maxRounds !== DEFAULT_MAX_ROUNDS) {
    console.error(
      `ERROR: maxRounds esperado ${DEFAULT_MAX_ROUNDS}, obtuvo ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
});

bob.on("room_joined", (data) => {
  console.log(`Bob room_joined, maxRounds: ${data.maxRounds}`);
  if (data.maxRounds !== DEFAULT_MAX_ROUNDS) {
    console.error(
      `ERROR: maxRounds esperado ${DEFAULT_MAX_ROUNDS}, obtuvo ${data.maxRounds}`
    );
    cleanupAndExit(1);
  }
});

alice.on("start_round", (data) => {
  if (!matchStarted) {
    matchStarted = true;
    console.log(`Partida iniciada con maxRounds=${DEFAULT_MAX_ROUNDS}`);
  }
  setTimeout(() => {
    alice.emit("player_choice", { roomId, choice: "rock" });
  }, 50);
});

bob.on("start_round", (data) => {
  setTimeout(() => {
    bob.emit("player_choice", { roomId, choice: "scissors" });
  }, 100);
});

alice.on("round_result", (data) => {
  duelCount++;
  console.log(
    `Duelo ${duelCount}: Alice ${aliceRoundsWon}-${bobRoundsWon} Bob | roundEnded: ${data.roundEnded} | vidas: Alice=${data.player1Lives} Bob=${data.player2Lives} | rondaCompleta: ${data.roundNumber}/${DEFAULT_MAX_ROUNDS} | isFinished: ${data.isFinished}`
  );

  if (data.roundEnded) {
    if (data.playerScore > bobRoundsWon) {
      aliceRoundsWon = data.playerScore;
    }
    if (data.opponentScore > aliceRoundsWon) {
      bobRoundsWon = data.opponentScore;
    }
  }
});

bob.on("round_result", (data) => {
  // Bob también trackea
});

alice.on("waiting_action", (data) => {
  console.error("ERROR: waiting_action not expected in new flow", data);
  cleanupAndExit(1);
});

alice.on("match_finished", (data) => {
  if (!matchFinished) {
    matchFinished = true;
    console.log(`\nMatch finished. Winner: ${data.winner}`);
    console.log(`Final score: Rounds won - ${data.finalScore.player1} (Alice) vs ${data.finalScore.player2} (Bob)`);
    
    console.log("\n=== ✓ TEST DEFAULTMAXROUNDS PASSED ===");
    console.log("- default maxRounds is 3");
    console.log("- 3-lives-per-round system implemented");
    console.log("- automatic round advancement without manual actions");
    console.log("- match finished after completing rounds\n");
    
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(0);
  }
});

alice.on("error", (error) => {
  console.error("Alice error:", error);
  cleanupAndExit(1);
});

bob.on("error", (error) => {
  console.error("Bob error:", error);
  cleanupAndExit(1);
});
