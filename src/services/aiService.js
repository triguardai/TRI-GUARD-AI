import { buildFallbackReply } from "../utils/fallback";

export async function sendMessage(userText, history = []) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText, history }),
    });

    if (!response.ok) {
      throw new Error("Failed request");
    }

    const data = await response.json();
    const modelReply = data?.reply;

    return modelReply || "Sistem AI sedang memuat ulang. Mohon coba lagi.";
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    return buildFallbackReply(userText);
  }
}

export default { sendMessage };
