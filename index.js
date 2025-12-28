const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static("public"));

/*
rooms = {
  roomId: {
    password: "xxxx",
    admin: socketId,
    messages: [{ from, data }]
  }
}
*/
const rooms = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // CREATE ROOM (ADMIN)
  socket.on("create-room", ({ roomId, password }) => {
    rooms[roomId] = {
      password,
      admin: socket.id,
      messages: []
    };
    socket.join(roomId);
    socket.emit("joined-room", { isAdmin: true });
  });

  // JOIN ROOM
  socket.on("join-room", ({ roomId, password }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit("error-msg", "Room does not exist");
      return;
    }

    if (room.password !== password) {
      socket.emit("error-msg", "Incorrect password");
      return;
    }

    socket.join(roomId);
    socket.emit("joined-room", { isAdmin: false });

    // Send chat history
    socket.emit("chat-history", room.messages);
  });

  // MESSAGE
  socket.on("message", ({ roomId, from, data }) => {
    const room = rooms[roomId];
    if (!room || !socket.rooms.has(roomId)) return;

    const msg = { from, data };
    room.messages.push(msg);

    socket.to(roomId).emit("message", msg);
  });

  // DELETE CHAT (ADMIN ONLY)
  socket.on("delete-chat", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.admin !== socket.id) {
      socket.emit("error-msg", "Only admin can delete chat");
      return;
    }

    room.messages = [];
    io.to(roomId).emit("chat-deleted");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("🚀 Chat server running on http://localhost:3000");
});
