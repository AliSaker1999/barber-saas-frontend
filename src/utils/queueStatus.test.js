import { describe, it, expect } from "vitest";
import { QUEUE_STATUS, queueHeadline, queueStage } from "./queueStatus";
import en from "../i18n/en";

const t = (key, params) => {
  const template = en[key];
  if (template === undefined) throw new Error(`Missing translation key: ${key}`);
  if (!params) return template;
  return Object.keys(params).reduce(
    (acc, name) => acc.split(`{${name}}`).join(String(params[name])),
    template
  );
};

describe("queueHeadline", () => {
  it("shows the position and an estimated range while waiting", () => {
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.WAITING, position: 4, waitTime: 28 },
      t
    );

    expect(result.key).toBe("waiting");
    expect(result.title).toBe("You're #4 in line");
    expect(result.sub).toMatch(/\d+–\d+ min/);
  });

  it("says 'you're next' instead of '#1'", () => {
    // "#1 in line" reads as "one person ahead of you" to plenty of people.
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.WAITING, position: 1, waitTime: 5 },
      t
    );

    expect(result.key).toBe("next");
    expect(result.title).toBe("You're next");
  });

  it("treats position 0 as next, not as an error", () => {
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.WAITING, position: 0, waitTime: 0 },
      t
    );
    expect(result.key).toBe("next");
  });

  it("switches to 'in the chair' once the service starts", () => {
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.IN_PROGRESS, position: 0, waitTime: 0 },
      t
    );

    expect(result.key).toBe("serving");
    expect(result.tone).toBe("success");
  });

  it("surfaces a pending walk-in as waiting on the shop, not on the queue", () => {
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.PENDING_APPROVAL, position: 2, waitTime: 20 },
      t
    );

    expect(result.key).toBe("pending");
    expect(result.tone).toBe("warning");
  });

  it("puts payment first when the place is only held on payment", () => {
    const result = queueHeadline(
      { statusId: QUEUE_STATUS.AWAITING_PAYMENT, position: 3, waitTime: 30 },
      t
    );

    expect(result.key).toBe("payment");
    expect(result.tone).toBe("warning");
  });

  it("returns nothing when the customer is not in a queue", () => {
    expect(queueHeadline(null, t)).toBeNull();
  });

  it("does not crash on a queue entry with no position yet", () => {
    const result = queueHeadline({ statusId: QUEUE_STATUS.WAITING }, t);
    expect(result).not.toBeNull();
  });
});

describe("queueStage", () => {
  it("walks Joined → almost up → your turn → in the chair", () => {
    expect(queueStage({ statusId: QUEUE_STATUS.WAITING, position: 8 })).toBe(0);
    expect(queueStage({ statusId: QUEUE_STATUS.WAITING, position: 3 })).toBe(1);
    expect(queueStage({ statusId: QUEUE_STATUS.WAITING, position: 1 })).toBe(2);
    expect(queueStage({ statusId: QUEUE_STATUS.IN_PROGRESS, position: 0 })).toBe(3);
  });

  it("never regresses as the position falls", () => {
    const stages = [9, 5, 4, 3, 2, 1].map((position) =>
      queueStage({ statusId: QUEUE_STATUS.WAITING, position })
    );

    for (let i = 1; i < stages.length; i += 1) {
      expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1]);
    }
  });

  it("treats a missing queue as the first step, not 'your turn'", () => {
    expect(queueStage(null)).toBe(0);
    expect(queueStage(undefined)).toBe(0);
  });
});
