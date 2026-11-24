const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest"
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function callGemini({ prompt, file = null, jsonMode = false }) {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const parts = [];

  if (prompt && prompt.trim()) {
    parts.push({ text: prompt.trim() });
  }

  if (file) {
    const base64Data = await fileToBase64(file);
    parts.push({
      inline_data: {
        mime_type: file.type || "image/jpeg",
        data: base64Data
      }
    });
  }

  if (parts.length === 0) {
    throw new Error("Please provide a prompt or attach a file.");
  }

  const payload = {
    contents: [{ parts }]
  };

  if (jsonMode) {
    payload.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `HTTP ${response.status}`;
        console.warn(`Model ${model} returned error: ${msg}. Trying next candidate...`);
        lastError = new Error(msg);
        continue;
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error("Empty response received from model.");
        continue;
      }

      if (jsonMode) {
        return JSON.parse(text);
      }
      return text;
    } catch (err) {
      console.warn(`Error connecting with model ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All candidate models are currently busy. Please try again in a few moments.");
}
