const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let initiatorId = null;
let receiverId = null;

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // ===== ROLE =====
  if (!initiatorId) {
    initiatorId = socket.id;
    socket.emit("role", { initiator: true });
    console.log("INITIATOR =", socket.id);
  } else {
    receiverId = socket.id;
    socket.emit("role", { initiator: false });
    console.log("RECEIVER =", socket.id);
  }

  // ===== PUBLIC KEY =====
  socket.on("public-key", (key) => {
    console.log("Public key relay");
    socket.broadcast.emit("public-key", key);
  });

  // ===== RECEIVER READY =====
  socket.on("ready-for-aes", () => {
    receiverId = socket.id;
    console.log("Receiver ready:", receiverId);

    if (initiatorId) {
      io.to(initiatorId).emit("ready-for-aes");
      console.log("Signal sent to initiator");
    }
  });

  // ===== AES =====
  socket.on("aes-key", (key) => {
    console.log("AES received from initiator");

    if (socket.id === initiatorId && receiverId) {
      io.to(receiverId).emit("aes-key", key);
      console.log("AES forwarded to receiver");
    }
  });

  // ===== MESSAGE =====
  socket.on("message", (msg) => {
    socket.broadcast.emit("message", msg);
  });

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    if (socket.id === initiatorId) initiatorId = null;
    if (socket.id === receiverId) receiverId = null;
  });
});

server.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
