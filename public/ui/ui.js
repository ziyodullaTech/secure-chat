export function setupUI(socket, state) {
    const chat = document.getElementById("chat");
    const input = document.getElementById("msg");
    const sendBtn = document.getElementById("sendBtn");
    const typingEl = document.getElementById("typing");



    // ===== RESTORE CHAT HISTORY =====
    const saved = JSON.parse(localStorage.getItem("chat") || "[]");

    (async () => {
        for (const m of saved) {
            const li = document.createElement("li");
            li.className = `message ${m.direction}`;
            li.dataset.id = m.id || "";

            const time = new Date(m.payload.time)
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            if (m.direction === "sent") {
                li.innerHTML = `<div>Encrypted message</div><small>${time}</small>`;
            } else {
                try {
                    const text = await state.decrypt(
                        m.payload.data,
                        state.sharedAESKey
                    );
                    li.innerHTML = `<div>${text}</div><small>${time}</small>`;
                } catch {
                    li.innerHTML = `<div>🔒 Locked message</div><small>${time}</small>`;
                }
            }

            chat.appendChild(li);
        }

        chat.scrollTop = chat.scrollHeight;
    })();

    //// new event for how this message is delivered
    socket.on("delivered", (id) => {
        const li = document.querySelector(`li[data-id="${id}"]`);
        if (!li) return;

        const small = li.querySelector("small");
        if (small) {
            small.textContent = small.textContent.replace("✓", "✓✓");
        }
    });
    //// socket messsage emit 
    



    ///// status 
    const statusEl = document.getElementById("status");

    socket.on("user-online", () => {
        statusEl.textContent = "Online";
        statusEl.className = "status online";
    });

    socket.on("user-offline", () => {
        statusEl.textContent = "Offline";
        statusEl.className = "status offline";
    });

    // ======================
    // SEND MESSAGE
    // ======================
    sendBtn.onclick = async () => {
        const messageId = crypto.randomUUID();

        if (!state.sharedAESKey) return;

        const text = input.value.trim();
        if (!text) return;

        const encrypted = await state.encrypt(text, state.sharedAESKey);

        const payload = {
            id : messageId,
            data: encrypted,
            time: Date.now()
        };

        socket.emit("message", payload);

        // save message here 
        saveMessage({
            id: messageId,
            direction: "sent",
            payload
        });

        // 🔹 o‘zimiz yuborgan message (o‘ngda)
        const li = document.createElement("li");
        li.className = "message sent";
        li.dataset.id = messageId;

        const time = new Date(payload.time)
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        li.innerHTML = `<div>${text}</div><small>${time} ✓</small>`;
        chat.appendChild(li);

        chat.scrollTop = chat.scrollHeight;
        input.value = "";
    };

    // ======================
    // RECEIVE MESSAGE
    // ======================
    socket.on("message", async payload => {
        if (!state.sharedAESKey) return;

        try {
            const msg = await state.decrypt(
                payload.data,
                state.sharedAESKey
            );

            const li = document.createElement("li");
            li.className = "message received";

            const time = new Date(payload.time)
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            li.innerHTML = `<div>${msg}</div><small>${time}</small>`;
            chat.appendChild(li);

            chat.scrollTop = chat.scrollHeight;
            saveMessage({
                direction: "received",
                payload
            })
            socket.emit("delivered", payload.id);

        } catch {
            console.log("Decrypt failed");
        }
    });

    // ======================
    // ENTER TO SEND
    // ======================
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendBtn.click();
    });

    // ======================
    // TYPING INDICATOR
    // ======================
    let typingTimeout;

    input.addEventListener("input", () => {
        socket.emit("typing");

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit("stop-typing");
        }, 800);
    });

    socket.on("typing", () => {
        typingEl.textContent = "User typing...";
    });

    socket.on("stop-typing", () => {
        typingEl.textContent = "";
    });





    ////////

    async function redrawHistory() {
        chat.innerHTML = "";

        const saved = JSON.parse(localStorage.getItem("chat") || "[]");

        for (const m of saved) {
            const li = document.createElement("li");
            li.className = `message ${m.direction}`;
            li.dataset.id = m.id || "";

            const time = new Date(m.payload.time)
                .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            if (m.direction === "sent") {
                li.innerHTML = `<div>Encrypted message</div><small>${time}</small>`;
            } else {
                try {
                    const text = await state.decrypt(
                        m.payload.data,
                        state.sharedAESKey
                    );
                    li.innerHTML = `<div>${text}</div><small>${time}</small>`;
                } catch {
                    li.innerHTML = `<div>🔒 Locked message</div><small>${time}</small>`;
                }
            }

            chat.appendChild(li);
        }

        chat.scrollTop = chat.scrollHeight;
    }

}

function saveMessage(msg) {
    const list = JSON.parse(localStorage.getItem("chat") || "[]");
    list.push(msg);
    localStorage.setItem("chat", JSON.stringify(list));
}



///////
