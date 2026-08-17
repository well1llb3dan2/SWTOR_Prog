export function decodeLogText(buffer: Buffer): string {
  if (buffer.length === 0) return "";

  const utf8Text = buffer.toString("utf8");
  if (!utf8Text.includes("�") && !utf8Text.includes("\uFFFD")) {
    return utf8Text.replace(/^\uFEFF/, "");
  }

  return buffer.toString("latin1").replace(/^\uFEFF/, "");
}
