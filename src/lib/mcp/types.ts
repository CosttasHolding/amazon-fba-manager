import type { SupabaseClient } from "@supabase/supabase-js";

export interface HandlerContext {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: HandlerContext
) => Promise<unknown>;

export interface ToolModule {
  definition: ToolDefinition;
  handler: ToolHandler;
}
