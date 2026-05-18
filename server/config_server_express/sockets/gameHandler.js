const GameRooms = require('./gameRooms');
const Ranking = require('../../models/Ranking');

const gameRooms = new GameRooms();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);

    // Crear o unirse a sala
    socket.on('create_room', async ({ username }) => {
      const roomId = gameRooms.createRoom(socket.id, username);
      socket.join(roomId);
      socket.emit('room_created', { roomId, message: 'Room created, waiting for opponent' });
    });

    socket.on('join_room', async ({ roomId, username }) => {
      const room = gameRooms.joinRoom(roomId, socket.id, username);
      if (room) {
        socket.join(roomId);
        io.to(roomId).emit('room_joined', {
          roomId,
          players: [room.player1.name, room.player2.name]
        });
        io.to(roomId).emit('start_round', { roundNumber: room.roundNumber });
      } else {
        socket.emit('error', { message: 'Room is full or does not exist' });
      }
    });

    // Elección del jugador
    socket.on('player_choice', ({ roomId, choice }) => {
      const bothReady = gameRooms.setPlayerChoice(roomId, socket.id, choice);
      if (bothReady) {
        const roundResult = gameRooms.resolveRound(roomId);
        if (roundResult) {
          const room = gameRooms.getRoom(roomId);
          
          // Emitir resultado a ambos
          io.to(roomId).emit('round_result', {
            playerChoice: room.player1.name === 'Tú' ? room.player1.choice : room.player2.choice,
            opponentChoice: room.player2.name === 'Tú' ? room.player1.choice : room.player2.choice,
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
            gameRooms.cleanupRoom(roomId);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 Client disconnected:', socket.id);
    });
  });
};
