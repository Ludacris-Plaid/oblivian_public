// API configuration — empty string = relative URLs (works in prod + Vite dev proxy)
const BASE = import.meta.env.VITE_API_URL || "";
export const API_URL = BASE;
export const WS_URL = (BASE ? BASE.replace("https://", "wss://").replace("http://", "ws://") : "") + "/ws/dashboard";
