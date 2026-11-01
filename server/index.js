
import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "1mb" }));

// --------------------------------------------------
// PROVIDER CONFIGURATION
// --------------------------------------------------

function getEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function configuredProviders() {
  const providers = [];

  const groqKey = getEnv("GROQ_API_KEY", "GROQ_KEY");
  const mistralKey = getEnv("MISTRAL_API_KEY", "MISTRAL_KEY");
  const geminiKey = getEnv("GEMINI_API_KEY");

  if (groqKey) {
    providers.push({
      name: "Groq",
      key: groqKey,
      model: getEnv("GROQ_MODEL") || "openai/gpt-oss-20b",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      type: "openai"
    });
  }

  if (mistralKey) {
    providers.push({
      name: "Mistral",
      key: mistralKey,
      model: getEnv("MISTRAL_MODEL") || "mistral-small-latest",
      endpoint: "https://api.mistral.ai/v1/chat/completions",
      type: "openai"
    });
  }

  if (geminiKey) {
    providers.push({
      name: "Gemini",
      key: geminiKey,
      model: getEnv("GEMINI_MODEL") || "gemini-3.8-flash",
      type: "gemini"
    });
  }

  return providers;
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  const providers = configuredProviders();

  res.json({
    ok: true,
    mode: providers.length ? "live" : "demo",
    providers: providers.map(provider => ({
      name: provider.name,
      model: provider.model
    }))
  });
});

// --------------------------------------------------
// PROMPT
// --------------------------------------------------

function makePrompt(question, options) {
  return `
You are answering a multiple-choice question.

Choose exactly one answer from the options provided.

Return ONLY valid JSON in this format:
{
  "optionId": "A",
  "reason": "Short explanation",
  "confidence": 0.95
}

Rules:
1. optionId must exactly match one of the supplied option IDs.
2. Never create a new option.
3. If the question requires personal information that you cannot know,
   return optionId as null.
4. Give a short explanation.
5. Do not return Markdown or text outside the JSON.

QUESTION:
${question}

AVAILABLE OPTIONS:
${options.map(option => `${option.id}: ${option.text}`).join("\n")}
`;
}

// --------------------------------------------------
// PARSE AI RESPONSE
// --------------------------------------------------

function parseModelResponse(raw, options, providerName) {
  try {
    const cleaned = String(raw || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("The model did not return JSON.");
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    const selectedId = parsed.optionId == null
      ? null
      : String(parsed.optionId).trim();

    const validOption = options.some(
      option => option.id === selectedId
    );

    return {
      provider: providerName,
      optionId: validOption ? selectedId : null,
      reason: String(parsed.reason || "No explanation provided.").slice(0, 400),
      confidence: Math.max(
        0,
        Math.min(1, Number(parsed.confidence) || 0)
      ),
      error: false
    };
  } catch (error) {
    return {
      provider: providerName,
      optionId: null,
      reason: `Response parsing failed: ${error.message}`,
      confidence: 0,
      error: true
    };
  }
}

// --------------------------------------------------
// GROQ AND MISTRAL API
// --------------------------------------------------

async function askOpenAIProvider(provider, prompt) {
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a precise multiple-choice assistant. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      data.message ||
      `HTTP ${response.status}`
    );
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("The provider returned an empty response.");
  }

  return content;
}

// --------------------------------------------------
// GEMINI API
// --------------------------------------------------

async function askGemini(provider, prompt) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": provider.key
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      `HTTP ${response.status}`
    );
  }

  const content = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("");

  if (!content) {
    throw new Error(
      "Gemini returned an empty response. Check its API access and quota."
    );
  }

  return content;
}

// --------------------------------------------------
// ASK EACH PROVIDER
// --------------------------------------------------

async function askProvider(provider, question, options) {
  const prompt = makePrompt(question, options);

  console.log(
    `Sending request to ${provider.name} using ${provider.model}`
  );

  const raw = provider.type === "gemini"
    ? await askGemini(provider, prompt)
    : await askOpenAIProvider(provider, prompt);

  const result = parseModelResponse(
    raw,
    options,
    provider.name
  );

  if (result.error) {
    console.error(`${provider.name} parsing failed:`, result.reason);
  } else {
    console.log(`${provider.name} responded successfully.`);
  }

  return result;
}

// --------------------------------------------------
// INPUT VALIDATION
// --------------------------------------------------

function validateInput(body) {
  const question = String(body?.question || "").trim();

  const options = Array.isArray(body?.options)
    ? body.options.map((option, index) => ({
        id: String(option.id || `opt-${index + 1}`).trim(),
        text: String(option.text || "").trim()
      }))
    : [];

  if (!question || question.length > 5000) {
    return {
      error: "Enter a question under 5,000 characters."
    };
  }

  if (
    options.length < 2 ||
    options.length > 20 ||
    options.some(option => !option.text || option.text.length > 1000)
  ) {
    return {
      error: "Provide 2–20 non-empty answer options."
    };
  }

  if (new Set(options.map(option => option.id)).size !== options.length) {
    return {
      error: "Option IDs must be unique."
    };
  }

  return { question, options };
}

// --------------------------------------------------
// CONSENSUS CALCULATION
// --------------------------------------------------

function buildResult(votes, options, demo = false) {
  const counts = {};

  for (const vote of votes) {
    if (vote.optionId) {
      counts[vote.optionId] = (counts[vote.optionId] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1]);

  const winnerId = sorted.length ? sorted[0][0] : null;

  const tied =
    sorted.length > 1 &&
    sorted[0][1] === sorted[1][1];

  const validVotes = votes.filter(vote => vote.optionId).length;

  return {
    demo,
    winner: options.find(option => option.id === winnerId) || null,
    tied,
    votes,
    counts,
    voteShare: winnerId && validVotes
      ? Math.round((counts[winnerId] / validVotes) * 100)
      : 0,
    validVotes,
    totalModels: votes.length,
    needsReview:
      !winnerId ||
      tied ||
      validVotes < Math.ceil(votes.length / 2)
  };
}

// --------------------------------------------------
// MAIN API ROUTE
// --------------------------------------------------

app.post("/api/choose", async (req, res) => {
  const validated = validateInput(req.body);

  if (validated.error) {
    return res.status(400).json({
      error: validated.error
    });
  }

  const { question, options } = validated;
  const providers = configuredProviders();

  console.log("\nNew question received:", question);
  console.log(
    "Configured providers:",
    providers.map(provider => provider.name).join(", ") || "None"
  );

  if (!providers.length) {
    return res.status(503).json({
      error: "No AI providers configured. Check your .env file."
    });
  }

  const settled = await Promise.allSettled(
    providers.map(provider =>
      askProvider(provider, question, options)
    )
  );

  const votes = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const message =
      result.reason?.message || "Unknown provider error";

    console.error(
      `${providers[index].name} failed:`,
      message
    );

    return {
      provider: providers[index].name,
      optionId: null,
      reason: message,
      confidence: 0,
      error: true
    };
  });

  return res.json(
    buildResult(votes, options, false)
  );
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log("------------------------------------");
  console.log(`ChoicePilot API running on port ${PORT}`);
  console.log("Configured AI providers:");

  for (const provider of configuredProviders()) {
    console.log(`- ${provider.name}: ${provider.model}`);
  }

  if (!configuredProviders().length) {
    console.log("- No providers configured");
  }

  console.log("------------------------------------");
});
