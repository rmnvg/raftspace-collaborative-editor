import { describe, expect, it } from "vitest";
import { formatRelativeTime, getInitials } from "./format";

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-08T12:00:00Z").getTime();

  it("formats a moment in the past in seconds", () => {
    expect(formatRelativeTime(new Date(now - 10_000).toISOString(), now)).toBe(
      "10 seconds ago",
    );
  });

  it("formats minutes in the past", () => {
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe(
      "5 minutes ago",
    );
  });

  it("formats hours in the past", () => {
    expect(formatRelativeTime(new Date(now - 3 * 60 * 60_000).toISOString(), now)).toBe(
      "3 hours ago",
    );
  });

  it("formats days in the past", () => {
    expect(formatRelativeTime(new Date(now - 2 * 24 * 60 * 60_000).toISOString(), now)).toBe(
      "2 days ago",
    );
  });
});

describe("getInitials", () => {
  it("uses first and last name initials", () => {
    expect(getInitials("Ramanjot Singh")).toBe("RS");
  });

  it("handles a single name", () => {
    expect(getInitials("Maya")).toBe("M");
  });

  it("falls back to a placeholder for an empty name", () => {
    expect(getInitials("   ")).toBe("?");
  });
});
