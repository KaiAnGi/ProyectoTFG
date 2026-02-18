import type { Server, Socket } from 'socket.io';
import { GameRooms } from './gameRoom.ts';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-types.ts';

const gameRooms = new GameRooms();

export function setupGameHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log('👤 Cliente conectado:', socket.id);

    // Crear sala
    socket.on('create_room', async ({ username }) => {
      const roomId = gameRooms.createRoom(socket.id, username);
      socket.join(roomId);
      socket.emit('room_created', { roomId, message: 'Sala creada, esperando oponente' });
      console.log(`🎮 Sala creada: ${roomId} por ${username}`);
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
        console.log(`✅ ${username} se unió a sala ${roomId}`);
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
              playerChoice: room.player1.choice || 'rock',
              opponentChoice: room.player2.choice || 'rock',
              result: roundResult.result,
              playerScore: room.player1.score,
              opponentScore: room.player2.score,
              roundNumber: roundResult.roundNumber
            });

            if (roundResult.isFinished) {
              const winner = room.player1.score > room.player2.score ? room.player1 : room.player2;
              io.to(roomId).emit('match_finished', {
                winner: winner.name,
                finalScore: { player1: room.player1.score, player2: room.player2.score }
              });
              console.log(`🏆 Partida terminada en ${roomId}. Ganador: ${winner.name}`);
              gameRooms.cleanupRoom(roomId);
            } else {
              io.to(roomId).emit('start_round', { roundNumber: roundResult.roundNumber });
            }
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 Cliente desconectado:', socket.id);
    });
  });
}