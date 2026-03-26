import type { Server, Socket } from 'socket.io';
import { GameRooms } from './gameRoom.ts';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-types.ts';
import { RankingService } from '../services/ranking-service.ts';

const gameRooms = new GameRooms();
const rankingService = new RankingService();

export function setupGameHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('Cliente conectado:', socket.id);

    // Crear sala
    socket.on('create_room', async ({ username, maxRounds = 3 }) => {
      // Validate maxRounds
      const validMaxRounds = [3, 5, 9].includes(maxRounds) ? maxRounds : 3;
      const roomId = gameRooms.createRoom(socket.id, username, validMaxRounds);
      socket.join(roomId);
      socket.emit('room_created', { roomId, message: 'Sala creada, esperando oponente', maxRounds: validMaxRounds });
      console.log(`Sala creada: ${roomId} por ${username} con ${validMaxRounds} rondas`);
    });

    // Unirse a sala
    socket.on('join_room', async ({ roomId, username }) => {
      const room = gameRooms.joinRoom(roomId, socket.id, username);
      if (room && room.player2) {
        socket.join(roomId);
        io.to(roomId).emit('room_joined', {
          roomId,
          players: [room.player1.name, room.player2.name],
          maxRounds: room.maxRounds
        });
        io.to(roomId).emit('start_round', { roundNumber: room.roundNumber });
        console.log(`${username} se unió a sala ${roomId}`);
      } else {
        socket.emit('error', { message: 'Sala llena o no existe' });
      }
    });

    // Elección del jugador
    socket.on('player_choice', ({ roomId, choice }) => {
      const bothReady = gameRooms.setPlayerChoice(roomId, socket.id, choice);
      
      if (bothReady) {
        const roundResult = gameRooms.resolveRound(roomId);
        if (roundResult) {
          const room = gameRooms.getRoom(roomId);
          
          if (room && room.player2) {
            // Emitir resultado a ambos
            io.to(roomId).emit('round_result', {
              playerChoice: roundResult.player1Choice,
              opponentChoice: roundResult.player2Choice,
              result: roundResult.result,
              playerScore: roundResult.player1Score,
              opponentScore: roundResult.player2Score,
              player1Lives: roundResult.player1Lives,
              player2Lives: roundResult.player2Lives,
              roundEnded: roundResult.roundEnded,
              roundNumber: roundResult.roundNumber,
              isFinished: roundResult.isFinished
            });

            // Si la partida terminó, esperar decisión de retiro o simplemente terminar
            if (roundResult.isFinished) {
              const player1Score = room.player1.roundsWon;
              const player2Score = room.player2.roundsWon;
              const winner = player1Score >= player2Score ? room.player1 : room.player2;
              const loser = winner.id === room.player1.id ? room.player2 : room.player1;

              io.to(roomId).emit('match_finished', {
                winner: winner.name,
                finalScore: { player1: player1Score, player2: player2Score }
              });

              rankingService.updatePlayerStats(winner.name, true).catch(err =>
                console.error('Error al actualizar estadísticas:', err)
              );
              if (loser) {
                rankingService.updatePlayerStats(loser.name, false).catch(err =>
                  console.error('Error al actualizar estadísticas:', err)
                );
              }

              console.log(`Partida terminada en ${roomId}. Ganador: ${winner.name}`);
              gameRooms.cleanupRoom(roomId);
            } else {
              // La partida continúa: emitir siguiente ronda/duelo automáticamente
              const nextRoundNumber = gameRooms.getRoom(roomId)?.roundNumber || roundResult.roundNumber;
              io.to(roomId).emit('start_round', {
                roundNumber: nextRoundNumber
              });
            }
          }
        }
      }
    });

    // Decisión de revancha o retiro
    socket.on('player_action', ({ roomId, action }) => {
      const room = gameRooms.getRoom(roomId);
      if (!room) return;
      const isMatchFinished = room.roundNumber >= room.maxRounds && (room.player1.lives === 0 || (room.player2?.lives || 0) === 0);
      
      // Mantener retiro como salida temprana voluntaria.
      if (isMatchFinished) {
        return;
      }

      {
        // Match is over, handle final action
        const actionResult = gameRooms.setPlayerAction(roomId, socket.id, action);
        
        if (actionResult.gameEnded) {
          const room = gameRooms.getRoom(roomId);
          if (room) {
            const winner = actionResult.winner ? 
              (room.player1.name === actionResult.winner ? room.player1 : room.player2) : 
              null;
            
            io.to(roomId).emit('match_finished', {
              winner: actionResult.winner || 'unknown',
              finalScore: { player1: room.player1.roundsWon, player2: room.player2?.roundsWon || 0 }
            });
            
            // Save match result to database
            if (winner) {
              rankingService.updatePlayerStats(winner.name, true).catch(err => 
                console.error('Error al actualizar estadísticas:', err)
              );
            }
            
            const loser = actionResult.winner === room.player1.name ? room.player2 : room.player1;
            if (loser) {
              rankingService.updatePlayerStats(loser.name, false).catch(err => 
                console.error('Error al actualizar estadísticas:', err)
              );
            }
            
            console.log(`Partida terminada en ${roomId}. Ganador: ${actionResult.winner}`);
            gameRooms.cleanupRoom(roomId);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}