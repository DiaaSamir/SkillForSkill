const { Server } = require('socket.io');

let io;

const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // سجل socket مع userId لما يتصل
    socket.on('register', ({ userId }) => {
      socket.join(userId.toString()); 
      console.log(`🔗 Registered socket ${socket.id} for user ${userId}`);
    });

    // لما يوصله إشعار بالانضمام لغرفة معينة
    socket.on('joinRoom', ({ roomId }) => {
      socket.join(roomId);
      console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
    });

    // استقبال رسالة من المستخدم
    socket.on('chatMessage', ({ roomId, senderId, message }) => {
      io.to(roomId).emit('message', {
        senderId,
        message,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

module.exports = { setupSocket, getIO };
