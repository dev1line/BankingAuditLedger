import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to ${config.url}`
    );
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error("Response error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface Log {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  payload: any;
  hash: string;
  tx_id?: string;
  committed_at?: string;
}

export interface CreateLogRequest {
  source: string;
  event_type: string;
  payload: any;
}

export interface LogResponse {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  payload: any;
  hash: string;
  tx_id?: string;
  committed_at?: string;
}

export interface VerificationResponse {
  id: string;
  hash_offchain: string;
  hash_onchain: string;
  is_valid: boolean;
  verified_at: string;
}

export interface ListLogsResponse {
  logs: LogResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

export const logService = {
  // Create a new log
  createLog: async (data: CreateLogRequest): Promise<LogResponse> => {
    const response = await api.post("/logs", data);
    return response.data;
  },

  // Get a log by ID
  getLog: async (id: string): Promise<LogResponse> => {
    const response = await api.get(`/logs/${id}`);
    return response.data;
  },

  // List logs with pagination and filters
  listLogs: async (
    params: {
      page?: number;
      page_size?: number;
      source?: string;
      event_type?: string;
    } = {}
  ): Promise<ListLogsResponse> => {
    const response = await api.get("/logs", { params });
    return response.data;
  },

  // Verify a log
  verifyLog: async (id: string): Promise<VerificationResponse> => {
    const response = await api.get(`/verify/${id}`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<HealthResponse> => {
    const response = await api.get("/healthz");
    return response.data;
  },
};

export default api;
