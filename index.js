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

  // ===== ROLE ASSIGN =====
  if (!initiatorId) {
    initiatorId = socket.id;
    socket.emit("role", { initiator: true });
    console.log("INITIATOR =", socket.id);
  } else if (!receiverId) {
    receiverId = socket.id;
    socket.emit("role", { initiator: false });
    console.log("RECEIVER =", socket.id);
  } else {
    // 3-user bo‘lsa — hozircha ruxsat yo‘q
    socket.disconnect();
    return;
  }

  // ===== PUBLIC KEY =====
  socket.on("public-key", (key) => {
    if (socket.id === initiatorId && receiverId) {
      io.to(receiverId).emit("public-key", key);
    } else if (socket.id === receiverId && initiatorId) {
      io.to(initiatorId).emit("public-key", key);
    }
  });

  // ===== RECEIVER READY =====
  socket.on("ready-for-aes", () => {
    if (socket.id === receiverId && initiatorId) {
      console.log("Receiver ready, notify initiator");
      io.to(initiatorId).emit("ready-for-aes");
    }
  });

  // ===== AES KEY =====
  socket.on("aes-key", (key) => {
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

    if (socket.id === initiatorId) {
      initiatorId = receiverId;
      receiverId = null;

      if (initiatorId) {
        io.to(initiatorId).emit("role", { initiator: true });
        console.log("New INITIATOR =", initiatorId);
      }
    } else if (socket.id === receiverId) {
      receiverId = null;
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
