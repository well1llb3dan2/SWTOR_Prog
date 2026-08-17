export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  process.env.API_URL?.replace(/\/$/, "") ??
  "https://swtor-analytics-api.onrender.com";
