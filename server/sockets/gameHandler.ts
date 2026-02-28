import type { Server, Socket } from 'socket.io';
import { GameRooms } from './gameRoom.ts';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-types.ts';

const gameRooms = new GameRooms();

export function setupGameHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('Cliente conectado:', socket.id);

    // Crear sala
    socket.on('create_room', async ({ username }) => {
      const roomId = gameRooms.createRoom(socket.id, username);
      socket.join(roomId);
      socket.emit('room_created', { roomId, message: 'Sala creada, esperando oponente' });
      console.log(`Sala creada: ${roomId} por ${username}`);
    });

    // Unirse a sala
    socket.on('join_room', async ({ roomId, username }) => {
      const room = gameRooms.joinRoom(roomId, socket.id, username);
      if (room && room.player2) {
        socket.join(roomId);
        io.to(roomId).emit('room_joined', {
          roomId,
          players: [room.player1.name, room.player2.name]
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
            // Emitir resultado a ambos y esperar decisión de revancha/retiro
            io.to(roomId).emit('round_result', {
              playerChoice: roundResult.player1Choice,
              opponentChoice: roundResult.player2Choice,
              result: roundResult.result,
              playerScore: roundResult.player1Score,
              opponentScore: roundResult.player2Score,
              roundNumber: roundResult.roundNumber
            });
            
            // Esperar decisión de rematch/retire
            io.to(roomId).emit('waiting_action', {
              message: 'Elige: rematch o retire'
            });
          }
        }
      }
    });

    // Decisión de revancha o retiro
    socket.on('player_action', ({ roomId, action }) => {
      const actionResult = gameRooms.setPlayerAction(roomId, socket.id, action);
      
      if (actionResult.gameEnded) {
        const room = gameRooms.getRoom(roomId);
        if (room) {
          io.to(roomId).emit('match_finished', {
            winner: actionResult.winner || 'unknown',
            finalScore: { player1: room.player1.consecutiveWins, player2: room.player2?.consecutiveWins || 0 }
          });
          console.log(`Partida terminada en ${roomId}. Ganador: ${actionResult.winner}`);
          gameRooms.cleanupRoom(roomId);
        }
      } else if (actionResult.bothReady) {
        // Ambos piden revancha, iniciar nueva ronda
        io.to(roomId).emit('start_round', { roundNumber: gameRooms.getRoom(roomId)?.roundNumber || 1 });
      }
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}