import { io } from "socket.io-client";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

/*
  Test para verificar que maxRounds funciona correctamente con diferentes valores.
  
  Qué valida:
  - maxRounds de 3 requiere 2 victorias para ganar
  - maxRounds de 5 requiere 3 victorias para ganar
  - maxRounds de 9 requiere 5 victorias para ganar
  - Las partidas terminan automáticamente cuando se alcanza el número de victorias necesarias
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
  let aliceVictories = 0;
  let bobVictories = 0;
  let roundCount = 0;
  
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
    console.log("Alice conectada");
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
    console.log("Bob conectado");
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
    console.log(`Sala creada con maxRounds=${data.maxRounds}`);
    if (data.maxRounds !== maxRounds) {
      console.error(`ERROR: maxRounds esperado ${maxRounds}, obtuvo ${data.maxRounds}`);
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }
    bob.emit("join_room", { roomId, username: `bob_${maxRounds}` });
  });

  alice.on("room_joined", (data) => {
    console.log(`Alice confirmó room_joined con maxRounds=${data.maxRounds}`);
  });

  bob.on("room_joined", (data) => {
    console.log(`Bob confirmó room_joined con maxRounds=${data.maxRounds}`);
  });

  alice.on("start_round", (data) => {
    roundCount++;
    console.log(`Ronda ${roundCount} iniciada`);
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
    if (data.result === "player1") {
      aliceVictories++;
    } else if (data.result === "player2") {
      bobVictories++;
    }
    console.log(
      `Ronda ${data.roundNumber}: Alice ${aliceVictories} - ${bobVictories} Bob | isFinished: ${data.isFinished}`
    );

    // Verificar que isFinished es correcto
    const expectedFinished = aliceVictories >= winsNeeded || bobVictories >= winsNeeded;
    if (data.isFinished !== expectedFinished) {
      console.error(
        `ERROR: isFinished debería ser ${expectedFinished} pero es ${data.isFinished}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    if (!data.isFinished) {
      // La partida continúa
    }
  });

  bob.on("round_result", (data) => {
    // Bob también trackea los resultados
  });

  alice.on("waiting_action", (data) => {
    // En este test, nunca debería llegar a waiting_action porque la partida
    // termina automáticamente cuando alguien alcanza las victorias necesarias
    console.error("ERROR: Recibido waiting_action cuando no debería");
    clearTimeout(failTimer);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  });

  alice.on("match_finished", (data) => {
    console.log(`Partida terminada. Ganador: ${data.winner}`);
    console.log(`Score final: ${data.finalScore.player1} - ${data.finalScore.player2}`);

    // Verificar que el marcador final es correcto
    if (data.finalScore.player1 !== aliceVictories || data.finalScore.player2 !== bobVictories) {
      console.error(
        `ERROR: Score incorrecto. Esperado ${aliceVictories}-${bobVictories}, obtuvo ${data.finalScore.player1}-${data.finalScore.player2}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    // Verificar que el ganador es correcto
    const expectedWinner = aliceVictories >= winsNeeded ? `alice_${maxRounds}` : `bob_${maxRounds}`;
    if (data.winner !== expectedWinner) {
      console.error(
        `ERROR: Ganador incorrecto. Esperado ${expectedWinner}, obtuvo ${data.winner}`
      );
      clearTimeout(failTimer);
      alice.disconnect();
      bob.disconnect();
      process.exit(1);
    }

    console.log(`✓ Test ${testCase.name} completado exitosamente\n`);
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
