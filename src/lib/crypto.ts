// src/lib/crypto.ts

// 1. Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// 2. Helper to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// 3. Generate RSA Key Pair (Public & Private)
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
};

// 4. Import a Public Key (from string to CryptoKey)
const importPublicKey = async (pem: string) => {
  return await window.crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

// 5. Import a Private Key (from string to CryptoKey)
const importPrivateKey = async (pem: string) => {
  return await window.crypto.subtle.importKey(
    "pkcs8",
    base64ToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
};

// 6. ENCRYPT MESSAGE (Hybrid: AES + RSA)
export const encryptMessage = async (text: string, recipientPublicKeyStr: string, myPublicKeyStr: string) => {
  try {
    // A. Generate a random AES Session Key
    const sessionKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // B. Encrypt the text with the Session Key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      sessionKey,
      encoder.encode(text)
    );

    // C. Export the Session Key so we can encrypt IT
    const rawSessionKey = await window.crypto.subtle.exportKey("raw", sessionKey);

    // D. Encrypt the Session Key for Recipient
    const recipientKey = await importPublicKey(recipientPublicKeyStr);
    const encryptedKeyForRecipient = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      rawSessionKey
    );

    // E. Encrypt the Session Key for Myself (so I can read it later)
    const myKey = await importPublicKey(myPublicKeyStr);
    const encryptedKeyForMe = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      myKey,
      rawSessionKey
    );

    // F. Package everything
    return JSON.stringify({
      iv: arrayBufferToBase64(iv),
      content: arrayBufferToBase64(encryptedContent),
      keys: {
        recipient: arrayBufferToBase64(encryptedKeyForRecipient),
        sender: arrayBufferToBase64(encryptedKeyForMe)
      }
    });
  } catch (e) {
    console.error("Encryption failed:", e);
    return null;
  }
};

// 7. DECRYPT MESSAGE
export const decryptMessage = async (encryptedJsonString: string, myPrivateKeyStr: string, isSender: boolean) => {
  try {
    // A. Parse the package
    const packageData = JSON.parse(encryptedJsonString);
    if (!packageData.iv || !packageData.keys) return encryptedJsonString; // Fallback for old unencrypted messages

    // B. Get the encrypted session key (Either mine or the one sent to me)
    const encryptedSessionKeyStr = isSender ? packageData.keys.sender : packageData.keys.recipient;
    if (!encryptedSessionKeyStr) return "⚠️ Decryption Error: Key missing";

    // C. Decrypt the Session Key using my Private Key
    const privateKey = await importPrivateKey(myPrivateKeyStr);
    const decryptedSessionKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(encryptedSessionKeyStr)
    );

    // D. Import the decrypted Session Key
    const sessionKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedSessionKeyBuffer,
      "AES-GCM",
      true,
      ["decrypt"]
    );

    // E. Decrypt the Content
    const decryptedContentBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(packageData.iv) },
      sessionKey,
      base64ToArrayBuffer(packageData.content)
    );

    // F. Decode to text
    return new TextDecoder().decode(decryptedContentBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    // If JSON parse fails, it might be an old unencrypted message
    return encryptedJsonString.startsWith("{") ? "🔒 Message Locked" : encryptedJsonString; 
  }
};