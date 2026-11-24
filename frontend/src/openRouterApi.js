const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Live free models on OpenRouter
export const DEFAULT_MODELS = [
  "openrouter/free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free"
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getStoredKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem("OPENROUTER_API_KEY") || "";
}

export function setStoredKey(key) {
  localStorage.setItem("OPENROUTER_API_KEY", key.trim());
}

export async function callOpenRouter({ prompt, file = null, jsonMode = false }) {
  const apiKey = getStoredKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key is missing. Please add your key to proceed.");
  }

  let contentPayload;

  if (file && file.type.startsWith("image/")) {
    const dataUrl = await fileToDataUrl(file);
    contentPayload = [
      { type: "text", text: prompt.trim() },
      { type: "image_url", image_url: { url: dataUrl } }
    ];
  } else {
    contentPayload = prompt.trim();
  }

  const systemMessage = jsonMode 
    ? "You are an expert AI industrial engineering diagnostic system. Always respond with pure valid JSON only, without any markdown formatting, preamble, or commentary."
    : "You are EngiMind, an expert AI engineering assistant specializing in industrial machinery, predictive maintenance, and engineering problem-solving. Provide clear, direct, actionable, and accurate engineering insights.";

  const body = {
    models: DEFAULT_MODELS, // OpenRouter auto-routes across these free models
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: contentPayload }
    ],
    temperature: 0.3
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "EngiMind"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(msg);
  }

  const result = await response.json();
  const rawText = result?.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error("No response returned from the model.");
  }

  if (jsonMode) {
    const cleaned = rawText.replace(/```(?:json)?/gi, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Could not parse JSON response from model.");
    }
  }

  return rawText;
}
