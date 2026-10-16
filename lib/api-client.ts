export function apiURL(
  path: string,
  base = process.env.NEXT_PUBLIC_API_BASE_URL || "",
) {
  const endpoint = path.replace(/^\/api\//, "/");
  if (!["/recommend", "/leads", "/status"].includes(endpoint))
    throw new Error("Unknown API endpoint");
  if (!base) return "/api" + endpoint; // Existing full-Worker target.
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("API base must use HTTPS or local development");
  return base.replace(/\/$/, "") + endpoint;
}
export const apiRequest: typeof fetch = (input, init) => {
  if (typeof input !== "string")
    throw new Error("API endpoint must be a string");
  return fetch(apiURL(input), { ...init, credentials: "omit" });
};
