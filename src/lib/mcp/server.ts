import type { ToolModule, HandlerContext } from "./types";

export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const tools: ToolModule[] = [];

export function registerTool(module: ToolModule): void {
  const existing = tools.findIndex((t) => t.definition.name === module.definition.name);
  if (existing >= 0) {
    tools[existing] = module;
  } else {
    tools.push(module);
  }
}

export function getToolDefinitions() {
  return tools.map((t) => t.definition);
}

function getToolHandler(name: string): ToolModule | undefined {
  return tools.find((t) => t.definition.name === name);
}

export async function handleMcpRequest(
  body: Record<string, unknown>,
  ctx: HandlerContext
): Promise<JsonRpcResponse | null> {
  const { method, params, id } = body as {
    method?: string;
    params?: Record<string, unknown>;
    id?: string | number;
  };

  const respond = (result: unknown): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  });

  const respondError = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });

  if (method === "initialize") {
    return respond({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "fba-manager-mcp", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null;
  }

  if (method === "ping") {
    return respond({});
  }

  if (method === "tools/list") {
    return respond({ tools: getToolDefinitions() });
  }

  if (method === "tools/call") {
    const p = params as { name?: string; arguments?: Record<string, unknown> };
    if (!p?.name) {
      return respondError(-32602, "Missing tool name");
    }
    const tool = getToolHandler(p.name);
    if (!tool) {
      return respondError(-32601, `Unknown tool: ${p.name}`);
    }
    try {
      const result = await tool.handler(p.arguments ?? {}, ctx);
      return respond({ content: [{ type: "text", text: JSON.stringify(result) }] });
    } catch (err) {
      return respondError(-32603, err instanceof Error ? err.message : String(err));
    }
  }

  return respondError(-32601, `Method not found: ${method}`);
}
