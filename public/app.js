import {
    generateRSAKeyPair,
    exportPublicKey,
    importPublicKey,
    generateAESKey,
    exportAESKey,
    importAESKey,
    encryptAESKey,
    decryptAESKey,
    encryptMessage,
    decryptMessage,
    fingerprintFromPublicKey
} from "./crypto.js";

import { setupUI } from "./ui/ui.js";

const socket = io();

const state = {
    isInitiator: false,
    myKeyPair: null,
    theirPublicKey: null,
    sharedAESKey: null,
    encrypt: encryptMessage,
    decrypt: decryptMessage
};

// ===== CONNECT =====
socket.on("connect", async () => {
    state.sharedAESKey = null;
    state.theirPublicKey = null;

    state.myKeyPair = await generateRSAKeyPair();

    const pub = await exportPublicKey(state.myKeyPair);
    socket.emit("public-key", pub);
});

// ===== ROLE =====
socket.on("role", ({ initiator }) => {
    state.isInitiator = initiator;

    if (initiator) state.sharedAESKey = null;

    trySendAES();
});

// ===== PUBLIC KEY =====
socket.on("public-key", async keyArray => {
    state.theirPublicKey = await importPublicKey(keyArray);
    /////////////////
    const fp = await fingerprintFromPublicKey(keyArray);
    document.getElementById("fingerprint").textContent = fp;


    if (!state.isInitiator) {
        socket.emit("ready-for-aes");
    }

    trySendAES();
});

// ===== AES SEND =====
async function createAndSendAESKey() {
    if (!state.theirPublicKey) return;

    state.sharedAESKey = await generateAESKey();

    const raw = await exportAESKey(state.sharedAESKey);
    const encrypted = await encryptAESKey(
        raw,
        state.theirPublicKey
    );

    socket.emit("aes-key", Array.from(new Uint8Array(encrypted)));
}

function trySendAES() {
    if (
        state.isInitiator &&
        state.theirPublicKey &&
        !state.sharedAESKey
    ) {
        createAndSendAESKey();
    }
}

// ===== AES RECEIVE =====
socket.on("aes-key", async encryptedKey => {
    const raw = await decryptAESKey(
        new Uint8Array(encryptedKey),
        state.myKeyPair.privateKey
    );

    state.sharedAESKey = await importAESKey(raw);
});

// ===== UI INIT =====
setupUI(socket, state);
