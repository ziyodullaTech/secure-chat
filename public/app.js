// 🔌 Socket — DOIM ENG BIRINCHI
const socket = io();

// 🔐 Global crypto holatlar
let myKeyPair = null;
let sharedAESKey = null;
let theirPublicKey = null;
let sessionId = null;


// ===============================
// RSA KEYPAIR
// ===============================
async function generateRSAKeyPair() {
    myKeyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportMyPublicKey() {
    const exported = await crypto.subtle.exportKey(
        "spki",
        myKeyPair.publicKey
    );
    return Array.from(new Uint8Array(exported));
}

// ===============================
// SOCKET EVENTS
// ===============================
socket.on("connect", async () => {
    console.log("🔁 New session started");
    sessionId = crypto.randomUUID();

    // 🔥 PFS: eski kalitlarni o‘chiramiz
    sharedAESKey = null;
    theirPublicKey = null;
    myKeyPair = null;

    // 🔐 Yangi RSA keypair
    await generateRSAKeyPair();

    const myPublicKey = await exportMyPublicKey();
    socket.emit("public-key", myPublicKey);
});


// public key qabul qilish
socket.on("public-key", async (keyArray) => {
    theirPublicKey = await crypto.subtle.importKey(
        "spki",
        new Uint8Array(keyArray),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );

    if (!sharedAESKey) {
        await createAndSendAESKey();
    }
});

// AES key yuborish
async function createAndSendAESKey() {
    sharedAESKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    const rawAES = await crypto.subtle.exportKey("raw", sharedAESKey);

    const encryptedAES = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        theirPublicKey,
        rawAES
    );

    socket.emit("aes-key", {
        sessionId,
        key: Array.from(new Uint8Array(encryptedAES))
    });

}

// AES key qabul qilish
socket.on("aes-key", async ({ sessionId: incomingId, key }) => {
    if (incomingId !== sessionId) return;

    const rawAES = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        myKeyPair.privateKey,
        new Uint8Array(key)
    );

    sharedAESKey = await crypto.subtle.importKey(
        "raw",
        rawAES,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );

    console.log("🔐 New session AES ready");
});


// ===============================
// MESSAGE ENCRYPT / DECRYPT
// ===============================
async function encryptMessage(text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedAESKey,
        new TextEncoder().encode(text)
    );

    return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

async function decryptMessage(payload) {
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
        sharedAESKey,
        new Uint8Array(payload.data)
    );

    return new TextDecoder().decode(decrypted);
}

// ===============================
// UI
// ===============================
document.getElementById("sendBtn").onclick = async () => {
    if (!sharedAESKey) {
        alert("Kalit hali tayyor emas");
        return;
    }

    const input = document.getElementById("msg");
    const encrypted = await encryptMessage(input.value);
    socket.emit("message", encrypted);
    input.value = "";
};

socket.on("message", async (payload) => {
    const msg = await decryptMessage(payload);
    const li = document.createElement("li");
    li.textContent = msg;
    document.getElementById("chat").appendChild(li);
});
