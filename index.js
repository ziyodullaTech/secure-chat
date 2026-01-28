const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let initiatorId = null;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 🔥 Role aniqlash
    if (!initiatorId) {
        initiatorId = socket.id;
        socket.emit("role", { initiator: true });
    } else {
        socket.emit("role", { initiator: false });
    }

    // ===== EVENTS =====
    socket.on("public-key", (key) => socket.broadcast.emit("public-key", key));
    socket.on("aes-key", (key) => socket.broadcast.emit("aes-key", key));
    socket.on("message", (msg) => socket.broadcast.emit("message", msg));

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // 🔥 Agar INITIATOR chiqib ketsa
        if (socket.id === initiatorId) {
            initiatorId = null;

            // 🔁 Qolganlardan bittasini INITIATOR qilamiz
            const sockets = Array.from(io.sockets.sockets.keys());
            if (sockets.length > 0) {
                initiatorId = sockets[0];
                io.to(initiatorId).emit("role", { initiator: true });
                console.log("New INITIATOR:", initiatorId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server portda ishlayapti:", PORT);
});
