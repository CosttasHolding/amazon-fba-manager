import { getSpEndpoint, MARKETPLACE_IDS, SP_API_ENDPOINTS } from "./types";

interface SpApiClientOptions {
  accessToken: string;
  refreshToken?: string;
  marketplace?: string;
  sellerId?: string;
  endpoint?: string;
}

interface SpApiResponse<T> {
  payload?: T;
  errors?: Array<{ code: string; message: string; details?: string }>;
}

export class SpApiClient {
  private accessToken: string;
  private refreshToken: string;
  private endpoint: string;
  private marketplaceId: string;
  private sellerId: string;

  constructor(options: SpApiClientOptions) {
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken || "";
    this.endpoint = options.endpoint || (options.marketplace ? getSpEndpoint(options.marketplace) : SP_API_ENDPOINTS.NA);
    this.marketplaceId = options.marketplace ? (MARKETPLACE_IDS[options.marketplace] || MARKETPLACE_IDS.US) : MARKETPLACE_IDS.US;
    this.sellerId = options.sellerId || "";
  }

  getMarketplaceId(): string {
    return this.marketplaceId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.endpoint}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        "x-amz-access-token": this.accessToken,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      throw new SpApiAuthError("Token expired");
    }

    if (!res.ok) {
      const err: SpApiResponse<never> = await res.json().catch(() => ({}));
      const msg = err.errors?.[0]?.message || `HTTP ${res.status}`;
      throw new SpApiError(msg, res.status);
    }

    const data: SpApiResponse<T> = await res.json();
    if (data.errors?.length) {
      throw new SpApiError(data.errors[0].message, res.status);
    }

    return data.payload as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export class SpApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SpApiError";
    this.status = status;
  }
}

export class SpApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpApiAuthError";
  }
}
