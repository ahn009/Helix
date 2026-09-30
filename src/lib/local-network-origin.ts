/** Local HTTP origins allowed for development on another device on the LAN. */
export function isLocalNetworkOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" || url.port !== "8080") return false;
    const parts = url.hostname.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return false;
    }
    return parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168);
  } catch {
    return false;
  }
}
