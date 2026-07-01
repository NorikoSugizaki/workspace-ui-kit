import { describe, it, expect } from "vitest";

import {
  customersSchema,
  commentsSchema,
  workspaceSchema,
} from "@/lib/schema";

import customersData from "@/data/customers.json";
import commentsData from "@/data/comments.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/customers.json は customersSchema を満たす（furigana + deals 構造）", () => {
    const result = customersSchema.safeParse(customersData);
    expect(result.success).toBe(true);
  });

  it("data/comments.json は commentsSchema を満たす", () => {
    const result = commentsSchema.safeParse(commentsData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });
});
