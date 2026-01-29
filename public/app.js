const socket = io();

let isInitiator = false;
let myKeyPair = null;
let theirPublicKey = null;
let sharedAESKey = null;

// ===== RSA =====
async function generateRSAKeyPair() {
    myKeyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportMyPublicKey() {
    const buf = await crypto.subtle.exportKey("spki", myKeyPair.publicKey);
    return Array.from(new Uint8Array(buf));
}

// ===== CONNECT =====
socket.on("connect", async () => {
    sharedAESKey = null;
    theirPublicKey = null;

    await generateRSAKeyPair();
    const pub = await exportMyPublicKey();
    socket.emit("public-key", pub);
});

// ===== ROLE =====
socket.on("role", ({ initiator }) => {
    isInitiator = initiator;
    console.log("Role:", initiator ? "INITIATOR" : "RECEIVER");
});

// ===== PUBLIC KEY =====
socket.on("public-key", async (keyArray) => {
    theirPublicKey = await crypto.subtle.importKey(
        "spki",
        new Uint8Array(keyArray),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );

    if (!isInitiator) {
        socket.emit("ready-for-aes");
    }
});

// ===== AES SEND =====
socket.on("ready-for-aes", async () => {
    if (isInitiator && theirPublicKey && !sharedAESKey) {
        await createAndSendAESKey();
    }
});

async function createAndSendAESKey() {
    sharedAESKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const raw = await crypto.subtle.exportKey("raw", sharedAESKey);

    const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        theirPublicKey,
        raw
    );

    socket.emit("aes-key", Array.from(new Uint8Array(encrypted)));
    console.log("AES sent");
}

// ===== AES RECEIVE =====
socket.on("aes-key", async (encryptedKey) => {
    const raw = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        myKeyPair.privateKey,
        new Uint8Array(encryptedKey)
    );

    sharedAESKey = await crypto.subtle.importKey(
        "raw",
        raw,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );

    console.log("AES ready");
});

// ===== MESSAGE CRYPTO =====
async function encryptMessage(text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedAESKey,
        new TextEncoder().encode(text)
    );
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(data)) };
}

async function decryptMessage(payload) {
    if (!sharedAESKey) return null;

    try {
        const data = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
            sharedAESKey,
            new Uint8Array(payload.data)
        );
        return new TextDecoder().decode(data);
    } catch {
        return null;
    }
}

// ===== UI =====
document.getElementById("sendBtn").onclick = async () => {
    if (!sharedAESKey) {
        alert("Secure connection hali tayyor emas");
        return;
    }

    const input = document.getElementById("msg");
    const encrypted = await encryptMessage(input.value);
    socket.emit("message", encrypted);
    input.value = "";
};

socket.on("message", async (payload) => {
    const msg = await decryptMessage(payload);
    if (!msg) return;

    const li = document.createElement("li");
    li.textContent = msg;
    document.getElementById("chat").appendChild(li);
});
