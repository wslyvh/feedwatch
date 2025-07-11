type Category = "announcement" | "informative" | "events" | "other";

const systemPrompt =
  "You are a helpful assistant that classifies and summarizes tweets for a privacy on Ethereum newsletter.";

export async function getStatus() {
  const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

  const data = await res.json();
  return data.data;
}

export async function classify(text: string): Promise<Category> {
  const prompt = `Classify the following tweet into one of these categories: "announcement", "informative", "events", or "other".\n- "announcement": New features, product launches, partnerships, upgrades, deployments, etc.\n- "informative": Research, tutorials, guides, thought pieces, analysis, educational content.\n- "events": Conferences, meetups, hackathons, AMAs, webinars, workshops, calls for papers, livestreams, etc.\nReply with a JSON object with a single property 'category'.\n\nTweet: "${text}"`;
  const schema = {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "The category of the tweet. One of: announcement, informative, events, other.",
        enum: ["announcement", "informative", "events", "other"],
      },
    },
    required: ["category"],
    additionalProperties: false,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-small",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 20,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tweet_category",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

  const data = await res.json();
  let output: any;
  try {
    output = JSON.parse(data.choices?.[0]?.message?.content);
  } catch (e) {
    throw new Error("Failed to parse structured output from OpenRouter");
  }
  if (
    ["announcement", "informative", "events", "other"].includes(
      output?.category
    )
  ) {
    return output.category;
  }

  return "other";
}

export async function summarize(text: string): Promise<string> {
  const prompt = `Summarize the following tweet or short text in a single, concise summary suitable for inclusion in a privacy newsletter. The summary should be between 32 and 64 characters. Shorter is fine, but don't exceed character limit. Reply with a JSON object with a single property 'summary'.\n\nText: "${text}"`;
  const schema = {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "A concise summary of the tweet or text, suitable for a newsletter. Should be between 32 and 64 characters.",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-small",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tweet_summary",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);

  const data = await res.json();
  let output: any;
  try {
    output = JSON.parse(data.choices?.[0]?.message?.content);
  } catch (e) {
    throw new Error("Failed to parse structured output from OpenRouter");
  }
  if (typeof output?.summary === "string") {
    return output.summary;
  }

  throw new Error("No summary returned from OpenRouter");
}

export async function classifyAndSummarize(
  text: string
): Promise<{ category: Category; summary: string; newsworthiness: number }> {
  const prompt = `For the following tweet, do three things:\n1. Classify it as one of: "announcement", "informative", "events", or "other".\n2. Assign a 'newsworthiness' score from 1 (not newsworthy) to 5 (very newsworthy) based on how relevant and important this tweet is for a privacy on Ethereum newsletter. Consider if it is an announcement, major update, research, event, or otherwise significant.\n3. Write a single, concise summary (32–64 characters) suitable for a privacy newsletter.\nReply with a JSON object with three properties: 'category', 'newsworthiness', and 'summary'.\n\nTweet: "${text}"`;
  const schema = {
    type: "object",
    properties: {
      category: {
        type: "string",
        description:
          "The category of the tweet. One of: announcement, informative, events, other.",
        enum: ["announcement", "informative", "events", "other"],
      },
      newsworthiness: {
        type: "integer",
        description: "A score from 1 (not newsworthy) to 5 (very newsworthy).",
        minimum: 1,
        maximum: 5,
      },
      summary: {
        type: "string",
        description:
          "A concise summary of the tweet or text, suitable for a newsletter. Should be between 32 and 64 characters.",
      },
    },
    required: ["category", "newsworthiness", "summary"],
    additionalProperties: false,
  };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-small",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 120,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tweet_classification_newsworthiness_and_summary",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const data = await res.json();
  let output: any;
  try {
    output = JSON.parse(data.choices?.[0]?.message?.content);
  } catch (e) {
    throw new Error("Failed to parse structured output from OpenRouter");
  }
  if (
    ["announcement", "informative", "events", "other"].includes(
      output?.category
    ) &&
    typeof output?.summary === "string" &&
    typeof output?.newsworthiness === "number"
  ) {
    return output;
  }
  throw new Error("No valid result returned from OpenRouter");
}
