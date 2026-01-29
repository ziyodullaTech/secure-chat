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

  if (!initiatorId) {
    initiatorId = socket.id;
    socket.emit("role", { initiator: true });
  } else {
    receiverId = socket.id;
    socket.emit("role", { initiator: false });
  }

  socket.on("public-key", (key) => {
    socket.broadcast.emit("public-key", key);
  });

  // 🔥 RECEIVER tayyorligini bildiradi
  socket.on("ready-for-aes", () => {
    receiverId = socket.id;
  });

  // 🔐 AES faqat RECEIVER ga yuboriladi
  socket.on("aes-key", (key) => {
    if (socket.id === initiatorId && receiverId) {
      io.to(receiverId).emit("aes-key", key);
    }
  });

  socket.on("message", (msg) => {
    socket.broadcast.emit("message", msg);
  });

  socket.on("disconnect", () => {
    if (socket.id === initiatorId) initiatorId = null;
    if (socket.id === receiverId) receiverId = null;
  });
});

server.listen(process.env.PORT || 3000);
