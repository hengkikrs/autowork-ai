export async function generateJsonWithAI({ system, user, schema }) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        json_schema: schema,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `AI request failed with [${response.status}] ${response.statusText}`,
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response did not include content");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Could not parse AI JSON:", content);
    throw error;
  }
}
