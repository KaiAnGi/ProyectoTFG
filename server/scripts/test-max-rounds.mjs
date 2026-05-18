import { io } from "socket.io-client";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

/*
  Test para verificar que maxRounds funciona correctamente con diferentes valores.
  
  Qué valida:
  - 3, 5 o 9 rondas se completan correctamente
  - Cada ronda: jugadores tienen 3 vidas, pierden 1 por duelo perdido
  - Cuando alguien llega a 0 vidas: ronda cierra, ganador suma 1 punto
  - Siguiente ronda empieza automáticamente (sin waiting_action)
  - Partida termina al completar N rondas (N=maxRounds)
  - Score final refleja rondas ganadas, no duel wins
*/

const testCases = [
  { maxRounds: 3, winsNeeded: 2, name: "3 rondas (BO3)" },
  { maxRounds: 5, winsNeeded: 3, name: "5 rondas (BO5)" },
  { maxRounds: 9, winsNeeded: 5, name: "9 rondas (BO9)" },
];

let currentTestIndex = 0;
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 30000);

function runNextTest() {
  if (currentTestIndex >= testCases.length) {
    console.log("\n=== ✓ TODOS LOS TESTS DE MAXROUNDS PASARON ===\n");
    process.exit(0);
  }

  const testCase = testCases[currentTestIndex];
  console.log(`\n=== TEST: ${testCase.name} ===`);
  console.log(`MaxRounds: ${testCase.maxRounds}, Victorias necesarias: ${testCase.winsNeeded}\n`);

  runTest(testCase);
  currentTestIndex++;
}

function runTest(testCase) {
  const { maxRounds, winsNeeded } = testCase;
  let roomId = null;
  let alice;
  let bob;
  let aliceRoundsWon = 0;
  let bobRoundsWon = 0;
  let roundCount = 0;
  let aliceLives = 3;
  let bobLives = 3;
  let duelCount = 0;
  
  const failTimer = setTimeout(() => {
    console.error(`Timeout en test ${testCase.name}`);
    alice?.disconnect();
    bob?.disconnect();
    process.exit(1);
  }, timeoutMs);

  // Alice siempre gana para que podamos controlar cuándo termina
  const aliceChoices = ["rock", "rock", "rock", "rock", "rock", "rock", "rock", "rock"];
  const bobChoices = ["scissors", "scissors", "scissors", "scissors", "scissors", "scissors", "scissors", "scissors"];

  alice = io(baseUrl, { transports: ["websocket", "polling"], reconnection: false });
  bob = io(baseUrl, { transports: ["websocket", "polling"], reconnection: false });

  alice.on("connect", () => {
    console.log("Alice connected");
    alice.emit("create_room", { username: `alice_${maxRounds}`, maxRounds });
  });

  alice.on("connect_error", (err) => {
    console.error("Alice connection error:", err.message);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });

  bob.on("connect", () => {
    console.log("Bob connected");
  });

  bob.on("connect_error", (err) => {
    console.error("Bob connection error:", err.message);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });

  alice.on("room_created", (data) => {
    roomId = data.roomId;
    console.log(`Room created with maxRounds=${data.maxRounds}`);
    if (data.maxRounds !== maxRounds) {
      console.error(`ERROR: expected maxRounds=${maxRounds}, got ${data.maxRounds}`);
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }
    bob.emit("join_room", { roomId, username: `bob_${maxRounds}` });
  });

  alice.on("room_joined", (data) => {
    console.log(`Alice confirmed room_joined with maxRounds=${data.maxRounds}`);
  });

  bob.on("room_joined", (data) => {
    console.log(`Bob confirmed room_joined with maxRounds=${data.maxRounds}`);
  });

  alice.on("start_round", (data) => {
    roundCount++;
    console.log(`Round ${roundCount} started`);
    setTimeout(() => {
      alice.emit("player_choice", { roomId, choice: aliceChoices[roundCount - 1] });
    }, 50);
  });

  bob.on("start_round", (data) => {
    setTimeout(() => {
      bob.emit("player_choice", { roomId, choice: bobChoices[roundCount - 1] });
    }, 100);
  });

  alice.on("round_result", (data) => {
    duelCount++;
    
    if (data.result === "player1") {
      bobLives -= 1;
    } else if (data.result === "player2") {
      aliceLives -= 1;
    }

    let wasRoundEnded = false;
    if (aliceLives === 0 || bobLives === 0) {
      wasRoundEnded = true;
      if (aliceLives > bobLives) {
        aliceRoundsWon += 1;
      } else if (bobLives > aliceLives) {
        bobRoundsWon += 1;
      }
      aliceLives = 3;
      bobLives = 3;
    }

    console.log(
      `Duel ${duelCount}: Alice ${aliceRoundsWon}-${bobRoundsWon} Bob | roundEnded: ${data.roundEnded} | round ${data.roundNumber}/${maxRounds} | isFinished: ${data.isFinished}`
    );

    // Verificar que roundEnded es correcto
    if (data.roundEnded !== wasRoundEnded) {
      console.error(
        `ERROR: roundEnded should be ${wasRoundEnded} but is ${data.roundEnded}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    // Verificar que isFinished es correcto (true solo cuando roundEnded AND roundNumber >= maxRounds)
    const expectedFinished = wasRoundEnded && data.roundNumber >= maxRounds;
    if (data.isFinished !== expectedFinished) {
      console.error(
        `ERROR: isFinished should be ${expectedFinished} but is ${data.isFinished}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }
  });

  bob.on("round_result", (data) => {
    // Bob también trackea los resultados
  });

  alice.on("waiting_action", (data) => {
    console.error("ERROR: waiting_action not expected in new flow", data);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });

  alice.on("match_finished", (data) => {
    console.log(`Match finished. Winner: ${data.winner}`);
    console.log(`Final score: ${data.finalScore.player1} (Alice) vs ${data.finalScore.player2} (Bob) rounds won`);

    // Verificar que el marcador final es correcto (rondas ganadas, no duels)
    if (data.finalScore.player1 !== aliceRoundsWon || data.finalScore.player2 !== bobRoundsWon) {
      console.error(
        `ERROR: Incorrect score. Expected ${aliceRoundsWon}-${bobRoundsWon}, got ${data.finalScore.player1}-${data.finalScore.player2}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    // Verificar que el ganador es el que ganó más rondas
    const expectedWinnerName = aliceRoundsWon > bobRoundsWon ? `alice_${maxRounds}` : `bob_${maxRounds}`;
    if (data.winner !== expectedWinnerName) {
      console.error(
        `ERROR: Incorrect winner. Expected ${expectedWinnerName}, got ${data.winner}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    console.log(`✓ Test ${testCase.name} completed successfully\n`);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();

    // Ejecutar siguiente test
    setTimeout(runNextTest, 1000);
  });

  alice.on("error", (error) => {
    console.error("Alice error:", error);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });

  bob.on("error", (error) => {
    console.error("Bob error:", error);
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });
}

// Iniciar primer test
runNextTest();
