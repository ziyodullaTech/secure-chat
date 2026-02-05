// ===== RSA =====
export async function generateRSAKeyPair() {
    return crypto.subtle.generateKey(
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

export async function exportPublicKey(keyPair) {
    const buf = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    return Array.from(new Uint8Array(buf));
}

export async function importPublicKey(keyArray) {
    return crypto.subtle.importKey(
        "spki",
        new Uint8Array(keyArray),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

// ===== AES =====
export async function generateAESKey() {
    return crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function exportAESKey(key) {
    return crypto.subtle.exportKey("raw", key);
}

export async function importAESKey(raw) {
    return crypto.subtle.importKey(
        "raw",
        raw,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

export async function encryptAESKey(rawKey, publicKey) {
    return crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        rawKey
    );
}

export async function decryptAESKey(data, privateKey) {
    return crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        data
    );
}

// ===== MESSAGE =====
export async function encryptMessage(text, aesKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(text)
    );

    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
}

export async function decryptMessage(payload, aesKey) {
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
        aesKey,
        new Uint8Array(payload.data)
    );

    return new TextDecoder().decode(decrypted);
}

////////////////////////////////////
async function fingerprintFromPublicKey(pubKeyArray) {
    const hash = await crypto.subtle.digest(
        "SHA-256",
        new Uint8Array(pubKeyArray)
    );

    return Array.from(new Uint8Array(hash))
        .slice(0, 8)
        .map(b => b.toString(16).padStart(2, "0"))
        .join(":");
}
