import { describe, expect, it } from "vitest";
import { generateToken, validateToken } from "../../../src/utils/token";

describe("Token Utils", () => {
  describe("generateToken", () => {
    it("should return a non-empty string", () => {
      const token = generateToken();

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should return different tokens on each call", () => {
      const token1 = generateToken();
      const token2 = generateToken();
      const token3 = generateToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it("should return token with correct length (64 hex characters)", () => {
      const token = generateToken();

      expect(token.length).toBe(64);
    });

    it("should return token containing only valid hexadecimal characters", () => {
      const token = generateToken();

      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate multiple unique tokens", () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe("validateToken", () => {
    it("should return true for valid token", () => {
      const token = generateToken();

      expect(validateToken(token)).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(validateToken("")).toBe(false);
    });

    it("should return false for token with incorrect length", () => {
      expect(validateToken("a".repeat(63))).toBe(false); // Too short
      expect(validateToken("a".repeat(65))).toBe(false); // Too long
      expect(validateToken("a".repeat(32))).toBe(false); // Wrong length
    });

    it("should return false for token with invalid characters", () => {
      expect(validateToken("g".repeat(64))).toBe(false); // 'g' is not valid hex
      expect(validateToken("z".repeat(64))).toBe(false); // 'z' is not valid hex
      expect(validateToken("A".repeat(64))).toBe(false); // Uppercase not allowed
      expect(validateToken(`${"0".repeat(63)}G`)).toBe(false); // Invalid char at end
    });

    it("should return false for null", () => {
      expect(validateToken(null as unknown as string)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(validateToken(undefined as unknown as string)).toBe(false);
    });

    it("should return true for valid hex token with all digits", () => {
      const token = "0".repeat(64);

      expect(validateToken(token)).toBe(true);
    });

    it("should return true for valid hex token with all letters", () => {
      const token = "a".repeat(64);

      expect(validateToken(token)).toBe(true);
    });

    it("should return true for valid hex token with mixed characters", () => {
      const token = "0123456789abcdef".repeat(4);

      expect(validateToken(token)).toBe(true);
    });
  });
});
