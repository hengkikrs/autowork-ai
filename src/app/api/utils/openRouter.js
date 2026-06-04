const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

function extractJson(content) {
  if (!content) {
    throw new Error("OpenRouter response did not include message content.");
  }

  if (typeof content === "object") {
    return content;
  }

  const text = String(content).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("OpenRouter response was not valid JSON.");
  }
}

export async function generateOpenRouterJson({
  messages,
  schema,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  temperature = 0.2,
  maxTokens = 5000,
  userId,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENROUTER_API_KEY is not configured.");
    error.code = "OPENROUTER_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "https://autowork-ai.vercel.app",
      "X-OpenRouter-Title": "AutoWork AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      user: userId,
      provider: {
        require_parameters: true,
      },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          strict: true,
          schema: schema.schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `OpenRouter request failed with ${response.status}: ${body.slice(0, 500)}`,
    );
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return {
    json: extractJson(content),
    model: data?.model || model,
    usage: data?.usage || null,
  };
}
