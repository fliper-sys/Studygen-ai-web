# Firestore Security Specification

This document details the security model for Study Genius.

## 1. Data Invariants
- Each user's workspace, summaries, goals, assignments, and test history must be private and accessible only by their authenticated owner (`uid` match).
- The `uid` of the document path `/users/{uid}` must match the `request.auth.uid`.
- Document properties like `userId` in sub-collections must strictly match the authenticated user's ID (`request.auth.uid`).
- Input strings and database keys must have structural sizing limits to protect against Denial of Wallet attacks.

## 2. The "Dirty Dozen" Payloads
Here are the 12 payloads representing malicious actions that the security rules must block:

1. **Self-Update of Streak by non-authenticated user** (blocked by lack of session key)
2. **Accessing another user's goals** (blocked by path owner check)
3. **Modifying another user's profile** (blocked by strict document path owner check)
4. **Creating a Goal with an empty ID** (blocked by validation shape)
5. **Writing an assignment with custom arbitrary field overrides** (blocked by exact keys check)
6. **Setting high streak counts above bounds** (blocked by number range validation)
7. **Attempting to read another user's academic summary** (blocked by parent collection owner gate)
8. **Submitting test history under another user's UID** (blocked by auth identification match)
9. **Injecting code strings as a course subject name** (blocked by size and content constraints)
10. **Writing extremely large summary texts (>100KB)** (blocked by size validation)
11. **Maliciously deleting another student's courses** (blocked by delete ownership check)
12. **Tampering with the quiz schema format or options length** (blocked by array size constraint limits)

## 3. Test Runner
Below is a conceptual test suite representing validation rules:

```javascript
// Firestore Rules Test Suite (Conceptual Model)
describe("Study Genius Security", () => {
  it("blocks unauthenticated access", () => {
    assert.denied(db.doc("users/alice").get());
  });
  it("allows owner read/write to their own data", () => {
    assert.allowed(db.auth("alice").doc("users/alice").set({ uid: "alice", email: "alice@example.com", courses: [], studentStreak: 0, createdAt: "2026-06-21" }));
  });
  it("blocks alice from reading bob's summary info", () => {
    assert.denied(db.auth("alice").doc("users/bob/summaries/math").get());
  });
});
```
