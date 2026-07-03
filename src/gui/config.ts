// API configuration — uses env var in production, localhost for dev
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_URL = BASE;
export const WS_URL = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/ws/dashboard";
