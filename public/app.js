// 🔌 Socket — DOIM ENG BIRINCHI
const socket = io();

let isInitiator = false;

// 🔐 Global crypto holatlar
let myKeyPair = null;
let theirPublicKey = null;
let sharedAESKey = null;

// ===============================
// RSA KEYPAIR
// ===============================
async function generateRSAKeyPair() {
    myKeyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048, // 4096 shart emas, tezroq
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

async function exportMyPublicKey() {
    const exported = await crypto.subtle.exportKey("spki", myKeyPair.publicKey);
    return Array.from(new Uint8Array(exported));
}

// ===============================
// SOCKET EVENTS
// ===============================
socket.on("connect", async () => {
    sharedAESKey = null;
    theirPublicKey = null;

    await generateRSAKeyPair();
    const pub = await exportMyPublicKey();
    socket.emit("public-key", pub);
});


// serverdan role keladi
socket.on("role", ({ initiator }) => {
    isInitiator = initiator;
    console.log("Role:", initiator ? "INITIATOR" : "RECEIVER");
    trySendAES(); // 🔥 MUHIM
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

    trySendAES(); // 🔥 MUHIM
});



// ===============================
// AES KEY EXCHANGE
// ===============================
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

    socket.emit("aes-key", Array.from(new Uint8Array(encryptedAES)));
    console.log("🔐 AES key sent");
}

socket.on("aes-key", async (encryptedKeyArray) => {
    console.log("🔐 AES key received");

    const rawAES = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        myKeyPair.privateKey,
        new Uint8Array(encryptedKeyArray)
    );

    sharedAESKey = await crypto.subtle.importKey(
        "raw",
        rawAES,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );

    console.log("🔐 AES key ready");
});
////////// 
// AES ni qayta yuborish ni kutadigan yangi funksiya
function trySendAES() {
    if (isInitiator && theirPublicKey && !sharedAESKey) {
        console.log("🔐 Sending AES key");
        createAndSendAESKey();
    }
}


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

    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
    };
}

async function decryptMessage(payload) {
    if (!sharedAESKey) return null;

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
            sharedAESKey,
            new Uint8Array(payload.data)
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

// ===============================
// UI
// ===============================
document.getElementById("sendBtn").onclick = async () => {
    if (!sharedAESKey) {
        alert("🔐 Secure connection hali tayyor emas");
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
