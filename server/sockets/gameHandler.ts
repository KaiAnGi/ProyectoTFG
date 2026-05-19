import type { Server, Socket } from "socket.io";
import { GameRooms } from "./gameRoom.ts";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types/socket-types.ts";
import { RankingService } from "../services/ranking-service.ts";
import User from "../models/User.ts";

const gameRooms = new GameRooms();
const rankingService = new RankingService();
const INITIAL_ROUND_DURATION_SEC = 15;

type RoomTimer = {
  intervalId?: NodeJS.Timeout;
  timeoutId?: NodeJS.Timeout;
};

const roomTimers = new Map<string, RoomTimer>();

export function setupGameHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
  const emitLeaderboardUpdate = async () => {
    try {
      const top = await rankingService.getTopRanking(50);
      io.emit("leaderboard:update", top);
    } catch (error) {
      console.error("Error emitiendo leaderboard:update:", error);
    }
  };

  const clearRoundTimer = (roomId: string) => {
    const timer = roomTimers.get(roomId);
    if (!timer) return;
    if (timer.intervalId) clearInterval(timer.intervalId);
    if (timer.timeoutId) clearTimeout(timer.timeoutId);
    roomTimers.delete(roomId);
  };

  const finishTimedRound = async (roomId: string) => {
    clearRoundTimer(roomId);

    const roundResult = gameRooms.resolveRound(roomId);
    const room = gameRooms.getRoom(roomId);

    if (!roundResult || !room || !room.player2) {
      return;
    }

    io.to(roomId).emit("round_result", {
      playerChoice: roundResult.player1Choice,
      opponentChoice: roundResult.player2Choice,
      result: roundResult.result,
      roundWinner: roundResult.roundWinner,
      roundWinnerName: roundResult.roundWinnerName,
      playerScore: roundResult.player1Score,
      opponentScore: roundResult.player2Score,
      roundNumber: roundResult.roundNumber,
      isFinished: roundResult.isFinished,
    });

    if (roundResult.isFinished) {
      const player1Score = room.player1.roundsWon;
      const player2Score = room.player2.roundsWon;

      let winnerName = "Draw";
      if (player1Score > player2Score) {
        winnerName = room.player1.name;
      } else if (player2Score > player1Score) {
        winnerName = room.player2.name;
      }

      io.to(roomId).emit("match_finished", {
        winner: winnerName,
        finalScore: { player1: player1Score, player2: player2Score },
      });

      if (winnerName !== "Draw") {
        const winner =
          winnerName === room.player1.name ? room.player1 : room.player2;
        const loser =
          winner.id === room.player1.id ? room.player2 : room.player1;

        rankingService
          .updatePlayerStats(winner.name, true)
            .catch((err) =>
              console.error("Error updating winner stats:", err),
            );
          rankingService
            .updatePlayerStats(loser.name, false)
            .catch((err) =>
              console.error("Error updating loser stats:", err),
            );

        emitLeaderboardUpdate();
      }

      const p1Bet = room.player1BetAmount || 0;
      const p2Bet = room.player2BetAmount || 0;
      const totalPot = p1Bet + p2Bet;

      if (totalPot > 0) {
        try {
          if (winnerName !== "Draw") {
            // Winner takes the whole pot
            await User.findOneAndUpdate(
              { username: winnerName },
              { $inc: { bones: totalPot } },
            );
          } else {
            // Draw: return bets to each player
            const updates: Promise<any>[] = [];
            if (p1Bet > 0) {
              updates.push(
                User.findOneAndUpdate(
                  { username: room.player1.name },
                  { $inc: { bones: p1Bet } },
                ),
              );
            }
            if (p2Bet > 0) {
              updates.push(
                User.findOneAndUpdate(
                  { username: room.player2.name },
                  { $inc: { bones: p2Bet } },
                ),
              );
            }
            await Promise.all(updates);
          }

          // Fetch updated bones for both players
          const [p1User, p2User] = await Promise.all([
            User.findOne({ username: room.player1.name }),
            User.findOne({ username: room.player2.name }),
          ]);

          io.to(roomId).emit("bet_resolved", {
            winner: winnerName,
            amount: totalPot,
            player1Bet: p1Bet,
            player2Bet: p2Bet,
            player1Bones: p1User?.bones ?? 0,
            player2Bones: p2User?.bones ?? 0,
          });
        } catch (err) {
          console.error("Error liquidando apuesta:", err);
          io.to(roomId).emit("bet_error", {
            message: "Could not resolve the bet",
          });
        }
      }

      console.log(`Match finished in ${roomId}. Winner: ${winnerName}`);
      gameRooms.cleanupRoom(roomId);
      clearRoundTimer(roomId);
      return;
    }

    gameRooms.prepareNextRound(roomId);
    setTimeout(() => startTimedRound(roomId), 2000);
  };

  const getRoundDuration = (maxRounds: number, roundNumber: number): number => {
    if (maxRounds === 3) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 5, 5);
    }
    if (maxRounds === 5) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 4, 4);
    }
    if (maxRounds === 9) {
      return Math.max(INITIAL_ROUND_DURATION_SEC - (roundNumber - 1) * 3, 3);
    }
    return INITIAL_ROUND_DURATION_SEC;
  };

  const startTimedRound = (roomId: string) => {
    const room = gameRooms.getRoom(roomId);
    if (!room || !room.player2) return;

    clearRoundTimer(roomId);

    const roundDuration = getRoundDuration(room.maxRounds, room.roundNumber);
    let timeLeftSec = roundDuration;

    io.to(roomId).emit("start_round", {
      roundNumber: room.roundNumber,
      timeLimitSec: roundDuration,
    });
    io.to(roomId).emit("round_timer", { timeLeftSec });

    const intervalId = setInterval(() => {
      timeLeftSec -= 1;
      if (timeLeftSec > 0) {
        io.to(roomId).emit("round_timer", { timeLeftSec });
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      finishTimedRound(roomId);
    }, roundDuration * 1000);

    roomTimers.set(roomId, { intervalId, timeoutId });
  };

  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log("Client connected:", socket.id);

      socket.on("create_room", async ({ username, maxRounds = 3 }) => {
        const validMaxRounds = [3, 5, 9].includes(maxRounds) ? maxRounds : 3;
        const roomId = gameRooms.createRoom(socket.id, username, validMaxRounds);
        socket.join(roomId);
        socket.emit("room_created", {
          roomId,
          message: "Room created, waiting for opponent",
          maxRounds: validMaxRounds,
          playerRole: "player1",
          playerName: username,
          opponentName: null,
        });
        console.log(`Room created: ${roomId} by ${username} with ${validMaxRounds} rounds`);
      });

      const emitCameraReadyStatus = (roomId: string) => {
        const status = gameRooms.getCameraStatus(roomId);
        io.to(roomId).emit("camera_ready_status", status);
      };

      socket.on("join_room", async ({ roomId, username }) => {
        const room = gameRooms.joinRoom(roomId, socket.id, username);
        if (room && room.player2) {
          socket.join(roomId);
          socket.emit("room_joined", {
            roomId,
            maxRounds: room.maxRounds,
            playerRole: "player2",
            playerName: username,
            opponentName: room.player1.name,
          });
          socket.to(roomId).emit("room_joined", {
            roomId,
            maxRounds: room.maxRounds,
            playerRole: "player1",
            playerName: room.player1.name,
            opponentName: username,
          });
          emitCameraReadyStatus(roomId);
          console.log(`${username} joined room ${roomId}`);
        } else {
          socket.emit("error", { message: "Room is full or does not exist" });
        }
      });

      socket.on("player_choice", ({ roomId, choice }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        if (!room.player2) {
          socket.emit("error", { message: "No opponent in the room yet" });
          return;
        }
        gameRooms.setPlayerChoice(roomId, socket.id, choice);
      });

      socket.on("camera_ready", ({ roomId }) => {
        gameRooms.setCameraReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("camera_not_ready", ({ roomId }) => {
        gameRooms.setCameraNotReady(roomId, socket.id);
        emitCameraReadyStatus(roomId);
      });

      socket.on("start_game", ({ roomId }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room || !room.player2) {
          socket.emit("error", { message: "The room is not complete" });
          return;
        }

        // Verificar que ambos jugadores siguen conectados
        const p1Sockets = io.sockets.sockets.get(room.player1.id);
        const p2Sockets = io.sockets.sockets.get(room.player2.id);
        if (!p1Sockets || !p2Sockets) {
          socket.emit("error", {
            message: "The opponent has disconnected",
          });
          return;
        }

        if (!gameRooms.isBothCamerasReady(roomId)) {
          socket.emit("error", {
            message: "Both players must be ready to start",
          });
          return;
        }

        if (!room.betAmount || !room.player1BetConfirmed || !room.player2BetConfirmed) {
          socket.emit("bet_error", {
            message: "Both players must confirm the bet before starting",
          });
          return;
        }

        startTimedRound(roomId);
      });

      // --- WEBRTC SIGNALING RELAY ---
      socket.on("webrtc_offer", ({ sdp, roomId }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) return;
        const targetId = room.player1.id === socket.id ? room.player2?.id : room.player1.id;
        if (targetId) {
          io.to(targetId).emit("webrtc_offer", {
            sdp,
            type: "offer",
            targetSocketId: socket.id,
          });
        }
      });

      socket.on("webrtc_answer", ({ sdp, roomId }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) return;
        const targetId = room.player1.id === socket.id ? room.player2?.id : room.player1.id;
        if (targetId) {
          io.to(targetId).emit("webrtc_answer", {
            sdp,
            type: "answer",
            targetSocketId: socket.id,
          });
        }
      });

      socket.on("webrtc_ice_candidate", ({ candidate, sdpMid, sdpMLineIndex, roomId }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) return;
        const targetId = room.player1.id === socket.id ? room.player2?.id : room.player1.id;
        if (targetId) {
          io.to(targetId).emit("webrtc_ice_candidate", {
            candidate,
            sdpMid,
            sdpMLineIndex,
            targetSocketId: socket.id,
          });
        }
      });

      socket.on("set_bet", async ({ roomId, amount }) => {
        const room = gameRooms.getRoom(roomId);
        if (!room) {
          socket.emit("bet_error", { message: "Room not found" });
          return;
        }

        if (!room.player2) {
          socket.emit("bet_error", { message: "No opponent in the room yet" });
          return;
        }

        const normalizedAmount = Math.floor(Number(amount));
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
          socket.emit("bet_error", { message: "Bet must be greater than 0" });
          return;
        }

        const isPlayer1 = socket.id === room.player1.id;
        const isPlayer2 = socket.id === room.player2.id;

        if (!isPlayer1 && !isPlayer2) {
          socket.emit("bet_error", { message: "Invalid player in the room" });
          return;
        }

        const playerName = isPlayer1 ? room.player1.name : room.player2.name;

        // Prevenir doble confirmación
        if (isPlayer1 && room.player1BetConfirmed) {
          socket.emit("bet_error", { message: "You have already confirmed your bet" });
          return;
        }
        if (isPlayer2 && room.player2BetConfirmed) {
          socket.emit("bet_error", { message: "Ya confirmaste tu apuesta" });
          return;
        }

        // Descontar la apuesta del jugador atómicamente (solo si tiene fondos suficientes)
        const deducted = await User.findOneAndUpdate(
          { username: playerName, bones: { $gte: normalizedAmount } },
          { $inc: { bones: -normalizedAmount } },
          { new: true },
        );
        if (!deducted) {
          socket.emit("bet_error", { message: "You don't have enough bones" });
          return;
        }

        // Registrar la apuesta individual
        if (isPlayer1) {
          room.player1BetAmount = normalizedAmount;
          room.player1BetConfirmed = true;
        } else {
          room.player2BetAmount = normalizedAmount;
          room.player2BetConfirmed = true;
        }

        // Calcular bote total
        const p1Bet = room.player1BetAmount || 0;
        const p2Bet = room.player2BetAmount || 0;
        room.betAmount = p1Bet + p2Bet;

        io.to(roomId).emit("bet_updated", {
          betAmount: p1Bet + p2Bet,
          player1Bet: p1Bet,
          player2Bet: p2Bet,
          player1Confirmed: !!room.player1BetConfirmed,
          player2Confirmed: !!room.player2BetConfirmed,
        });
      });

      socket.on("disconnect", async () => {
        console.log("Client disconnected:", socket.id);
        const room = gameRooms.findRoomByPlayerSocket(socket.id);
        if (!room) return;

        // Si la partida ya empezó (ronda activa), no refundir
        if (room.roundNumber > 1 || room.player1.choice !== null || room.player2?.choice !== null) return;

        const playerBet = gameRooms.getPlayerBetAmount(room, socket.id);
        if (!playerBet || playerBet.bet <= 0) return;

        // Reembolsar la apuesta al jugador que se desconectó
        try {
          await User.findOneAndUpdate(
            { username: playerBet.playerName },
            { $inc: { bones: playerBet.bet } },
          );
          console.log(
            `Refunded ${playerBet.bet} bones to ${playerBet.playerName} for disconnection in room ${room.roomId}`,
          );
        } catch (err) {
          console.error("Error refunding bet after disconnection:", err);
        }

        // Notificar al otro jugador
        const otherId =
          room.player1.id === socket.id ? room.player2?.id : room.player1.id;
        if (otherId) {
          io.to(otherId).emit("bet_error", {
            message: "El oponente se desconectó — apuesta reembolsada",
          });
        }

        // Limpiar la sala
        gameRooms.cleanupRoom(room.roomId);
      });
    },
  );
}