const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let clients = []; // 🔥 GLOBAL bo‘lishi shart

io.on("connection", (socket) => {
    clients.push(socket.id);

    // role berish
    socket.emit("role", {
        initiator: clients.length === 1
    });

    socket.on("public-key", (key) => {
        socket.broadcast.emit("public-key", key);
    });

    socket.on("aes-key", (key) => {
        socket.broadcast.emit("aes-key", key);
    });

    socket.on("message", (msg) => {
        socket.broadcast.emit("message", msg);
    });

    socket.on("disconnect", () => {
        clients = clients.filter(id => id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server portda ishlayapti:", PORT);
});
