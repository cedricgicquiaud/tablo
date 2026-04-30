import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./encryption";

describe("encryption (AES-256-GCM)", () => {
  it("encrypts and decrypts a string round-trip", () => {
    const plaintext = "hello world";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(typeof ciphertext).toBe("string");
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  it("throws when CONNECTOR_ENCRYPTION_KEY is missing", () => {
    const original = process.env.CONNECTOR_ENCRYPTION_KEY;
    delete process.env.CONNECTOR_ENCRYPTION_KEY;
    try {
      expect(() => encrypt("x")).toThrow(/CONNECTOR_ENCRYPTION_KEY/);
    } finally {
      process.env.CONNECTOR_ENCRYPTION_KEY = original;
    }
  });

  it("throws when CONNECTOR_ENCRYPTION_KEY is not 64 hex chars", () => {
    const original = process.env.CONNECTOR_ENCRYPTION_KEY;
    process.env.CONNECTOR_ENCRYPTION_KEY = "deadbeef";
    try {
      expect(() => encrypt("x")).toThrow(/64 hex/);
    } finally {
      process.env.CONNECTOR_ENCRYPTION_KEY = original;
    }
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    const ciphertext = encrypt("secret");
    const tampered = ciphertext.slice(0, -2) + "00";
    expect(() => decrypt(tampered)).toThrow();
  });
});
