const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// static files (public/index.html)
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("User ulandi:", socket.id);

    // 🔑 public key relay
    socket.on("public-key", (key) => {
        socket.broadcast.emit("public-key", key);
    });

    // 🔐 AES key relay
    socket.on("aes-key", (data) => {
        socket.broadcast.emit("aes-key", data);
    });

    // 💬 encrypted message relay
    socket.on("message", (msg) => {
        socket.broadcast.emit("message", msg);
    });

    socket.on("disconnect", () => {
        console.log("User uzildi:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server portda ishlayapti:", PORT);
});
