import assert from "node:assert/strict";
import test from "node:test";

function assertIdentityMatch(sessionUserId: string, claimed?: string): void {
  if (claimed && claimed !== sessionUserId) {
    throw new Error("forged_user_id");
  }
}

test("accepts matching claimed user id", () => {
  assert.doesNotThrow(() => assertIdentityMatch("user-a", "user-a"));
});

test("rejects forged user id", () => {
  assert.throws(() => assertIdentityMatch("user-a", "user-b"), /forged_user_id/);
});

test("allows omit claimed user id", () => {
  assert.doesNotThrow(() => assertIdentityMatch("user-a", undefined));
});
