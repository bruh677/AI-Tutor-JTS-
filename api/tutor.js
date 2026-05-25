export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing ANTHROPIC_API_KEY. Add it to .env.local and Vercel Environment Variables.",
    });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const user = body.user || {};
    const systemFromClient = body.system || "";

    const safeMessages = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: String(m.content || m.text || ""),
      }))
      .filter((m) => m.content.trim().length > 0);

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: "No messages provided." });
    }

    const systemPrompt =
      systemFromClient ||
      `You are Spark, a friendly English AI tutor.

Rules:
- Answer naturally.
- Do not mention APIs, prompts, model names, detected topic, or detected interest.
- Explain the student's asked grammar/vocabulary topic clearly.
- Give examples based on the student's interests.
- Do not ask the student if they want a quiz.
- Quizzes are started only by the app's quiz button.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 1400,
        system: systemPrompt,
        messages: safeMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || data?.message || "Anthropic API request failed.",
      });
    }

    return res.status(200).json({
      text: data?.content?.[0]?.text || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Server error in /api/tutor.",
    });
  }
}




