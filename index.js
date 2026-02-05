const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let initiatorId = null;
let receiverId = null;

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  assignRole(socket);
  
  ////// user offline or online trigger
  io.on("connection", (socket) => {
    socket.broadcast.emit("user-online");

    socket.on("disconnect", () => {
      socket.broadcast.emit("user-offline");
    });
  });

  // ---------- KEY EXCHANGE ----------
  socket.on("public-key", key => {
    socket.broadcast.emit("public-key", key);
  });

  socket.on("ready-for-aes", () => {
    receiverId = socket.id;

    if (initiatorId) {
      io.to(initiatorId).emit("ready-for-aes");
    }
  });

  socket.on("aes-key", key => {
    if (socket.id === initiatorId && receiverId) {
      io.to(receiverId).emit("aes-key", key);
    }
  });

  // ---------- MESSAGE ----------
  socket.on("message", msg => {
    socket.broadcast.emit("message", msg);
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    handleDisconnect(socket.id);
  });
});
//////////////////////////////////////
socket.on("typing", () => {
  socket.broadcast.emit("typing");
});

socket.on("stop-typing", () => {
  socket.broadcast.emit("stop-typing");
});
/////////////////////////////////////////////


socket.on("message", msg => {
  socket.broadcast.emit("message", msg);
});


////////////////////
// ===== ROLE ASSIGNMENT =====
function assignRole(socket) {
  if (!initiatorId) {
    initiatorId = socket.id;
    socket.emit("role", { initiator: true });
    console.log("INITIATOR =", socket.id);
  } else {
    receiverId = socket.id;
    socket.emit("role", { initiator: false });
    console.log("RECEIVER =", socket.id);
  }
}

// ===== DISCONNECT HANDLING =====
function handleDisconnect(id) {
  if (id === initiatorId) {
    initiatorId = receiverId;
    receiverId = null;

    if (initiatorId) {
      io.to(initiatorId).emit("role", { initiator: true });
      console.log("Receiver promoted to INITIATOR");
    }
  }

  if (id === receiverId) {
    receiverId = null;
  }
}

server.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
