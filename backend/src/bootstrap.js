// backend/src/bootstrap.js
const { Server } = require('socket.io');

module.exports = ({ strapi }) => {
  const io = new Server(strapi.server.httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (msg) => {
      socket.emit('chat message', msg);
      console.log('Message received:', msg);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};