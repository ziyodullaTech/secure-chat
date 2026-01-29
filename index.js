const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let initiatorId = null;
let receiverReady = false;

io.on("connection", (socket) => {

    if (!initiatorId) {
        initiatorId = socket.id;
        socket.emit("role", { initiator: true });
    } else {
        socket.emit("role", { initiator: false });
    }

    // RECEIVER tayyorligini aytadi
    socket.on("ready-for-aes", () => {
        receiverReady = true;
    });

    // AES faqat shunda yuboriladi
    socket.on("aes-key", (key) => {
        if (socket.id === initiatorId && receiverReady) {
            socket.broadcast.emit("aes-key", key);
        }
    });

    socket.on("public-key", (key) => {
        socket.broadcast.emit("public-key", key);
    });

    socket.on("message", (msg) => {
        socket.broadcast.emit("message", msg);
    });

    socket.on("disconnect", () => {
        if (socket.id === initiatorId) {
            initiatorId = null;
            receiverReady = false;

            const sockets = Array.from(io.sockets.sockets.keys());
            if (sockets.length > 0) {
                initiatorId = sockets[0];
                io.to(initiatorId).emit("role", { initiator: true });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server portda ishlayapti:", PORT);
});
