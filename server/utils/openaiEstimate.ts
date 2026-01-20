import { ENV } from "../_core/env";

export type EstimateExtraction = {
  scopeItems: string[];
  scopeOther?: string | null;
  roof: {
    material?: string | null;
    color?: string | null;
    squares?: number | null;
    layers?: number | null;
    pitch?: string | null;
    chimneyCount?: number | null;
    skylightCount?: number | null;
    starterFeet?: number | null;
    gutterApronFeet?: number | null;
    dripEdgeFeet?: number | null;
    flashingFeet?: number | null;
    flashingNeeded?: boolean | null;
    bootCount?: number | null;
    electricBootCount?: number | null;
    kitchenVentCount?: number | null;
    ventType?: string | null;
    ventCount?: number | null;
    iceWaterSquares?: number | null;
    iceWaterLines?: number | null;
    needsPlywood?: boolean | null;
    plywoodSheets?: number | null;
  };
  materials: Array<{
    name: string;
    quantity: number;
    unit?: string | null;
    notes?: string | null;
    required?: boolean | null;
  }>;
};

const buildPrompt = (text: string) => `You are a construction estimator.
Extract scope of work and roof/material details from the estimate text.
Return ONLY valid JSON with this schema:
{
  "scopeItems": string[],
  "scopeOther": string | null,
  "roof": {
    "material": string | null,
    "color": string | null,
    "squares": number | null,
    "layers": number | null,
    "pitch": string | null,
    "chimneyCount": number | null,
    "skylightCount": number | null,
    "starterFeet": number | null,
    "gutterApronFeet": number | null,
    "dripEdgeFeet": number | null,
    "flashingFeet": number | null,
    "flashingNeeded": boolean | null,
    "bootCount": number | null,
    "electricBootCount": number | null,
    "kitchenVentCount": number | null,
    "ventType": string | null,
    "ventCount": number | null,
    "iceWaterSquares": number | null,
    "iceWaterLines": number | null,
    "needsPlywood": boolean | null,
    "plywoodSheets": number | null
  },
  "materials": [{
    "name": string,
    "quantity": number,
    "unit": string | null,
    "notes": string | null,
    "required": boolean | null
  }]
}

Normalize scope items to these labels when possible: Roof, Siding, Gutters, Windows, Garage, Garage Door, Interior.
Use numbers when available. If missing, use null. Do not add extra keys.

Estimate text:
${text}`;

export async function extractEstimateWithOpenAI(text: string): Promise<EstimateExtraction> {
  if (!ENV.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const payload = {
    model: ENV.groqModel,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "user",
        content: buildPrompt(text),
      },
    ],
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.groqApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq extract failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq extract returned empty content");
  }

  try {
    return JSON.parse(content) as EstimateExtraction;
  } catch (error) {
    throw new Error("Groq extract returned invalid JSON");
  }
}
