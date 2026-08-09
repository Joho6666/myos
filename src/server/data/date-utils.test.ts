import { describe, expect, it } from "vitest";
import { dateOnly, todayAlias, todayDateKey } from "./date-utils";

describe("MyOS date utilities", () => {
  const justAfterMidnightInShanghai = new Date("2026-08-08T16:30:00.000Z");

  it("stores today and tomorrow using the configured local timezone", () => {
    expect(todayDateKey(justAfterMidnightInShanghai)).toBe("2026-08-09");
    expect(dateOnly("today", justAfterMidnightInShanghai)).toBe("2026-08-09");
    expect(dateOnly("tomorrow", justAfterMidnightInShanghai)).toBe("2026-08-10");
  });

  it("keeps explicit ISO dates and maps today's date back to the UI alias", () => {
    expect(dateOnly("2026-12-25", justAfterMidnightInShanghai)).toBe("2026-12-25");
    expect(dateOnly("not-a-date", justAfterMidnightInShanghai)).toBeNull();
    expect(todayAlias("2026-08-09", justAfterMidnightInShanghai)).toBe("today");
    expect(todayAlias("2026-08-10", justAfterMidnightInShanghai)).toBe("2026-08-10");
  });
});
