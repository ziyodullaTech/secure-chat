const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 🔥 ENG MUHIM QATOR
app.use(express.static("public"));

io.on("connection", (socket) => {
    ///////
    let clients = [];

    io.on("connection", (socket) => {
        clients.push(socket.id);

        socket.emit("role", {
            initiator: clients.length === 1
        });

        socket.on("disconnect", () => {
            clients = clients.filter(id => id !== socket.id);
        });

        socket.on("public-key", (key) => {
            socket.broadcast.emit("public-key", key);
        });

        socket.on("aes-key", (data) => {
            socket.broadcast.emit("aes-key", data);
        });

        socket.on("message", (msg) => {
            socket.broadcast.emit("message", msg);
        });
    });
////////
    socket.on("public-key", (key) => socket.broadcast.emit("public-key", key));
    socket.on("aes-key", (data) => socket.broadcast.emit("aes-key", data));
    socket.on("message", (msg) => socket.broadcast.emit("message", msg));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server portda ishlayapti:", PORT);
});

