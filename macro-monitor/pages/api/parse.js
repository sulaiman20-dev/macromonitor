export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { text, customFoods } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' field" });
    }

    const customList = (customFoods || [])
      .map(
        (f) =>
          `- "${f.name}": ${f.calories}cal, ${f.protein}g protein, ${f.fat}g fat, ${f.carbs}g carbs, ${f.fiber}g fiber, ${f.sodium}mg sodium, ${f.potassium}mg potassium, ${f.magnesium}mg magnesium`
      )
      .join("\n");

    const prompt = `You are a precise nutrition calculator. I'll describe food I ate. Break it into individual ingredients and estimate macros + electrolytes for each.

CUSTOM FOODS DATABASE (use these EXACT values when matched, scale by quantity):
${customList || "(none)"}

For everything else, use your USDA nutritional knowledge. Use realistic portions when not specified (e.g. chicken breast = ~6oz cooked, egg = large ~50g).

RESPOND WITH ONLY A JSON ARRAY. No backticks, no markdown, no explanation. Just the raw JSON array.

Each element must have exactly these fields:
{"name":"descriptive name with quantity","calories":number,"protein":number,"fat":number,"carbs":number,"fiber":number,"sodium":number,"potassium":number,"magnesium":number}

Rules:
- Break combo descriptions into individual ingredients (e.g. "eggs with spinach and butter" = 3 separate items)
- Account for cooking oils/fats when mentioned
- Round: calories to integer, grams to 1 decimal, mg to integer
- Use realistic portions when not specified

Here is what I ate: ${text}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res
        .status(response.status)
        .json({ error: `Claude API error: ${response.status}`, details: errText });
    }

    const data = await response.json();
    const rawText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Clean markdown fences
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    let items;
    try {
      items = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        items = JSON.parse(match[0]);
      } else {
        return res.status(500).json({ error: "Failed to parse Claude response", raw: cleaned.slice(0, 500) });
      }
    }

    if (!Array.isArray(items)) {
      return res.status(500).json({ error: "Response is not an array", raw: cleaned.slice(0, 500) });
    }

    // Validate & normalize
    const validated = items.map((it) => ({
      name: it.name || "Unknown food",
      calories: Number(it.calories) || 0,
      protein: Number(it.protein) || 0,
      fat: Number(it.fat) || 0,
      carbs: Number(it.carbs) || 0,
      fiber: Number(it.fiber) || 0,
      sodium: Number(it.sodium) || 0,
      potassium: Number(it.potassium) || 0,
      magnesium: Number(it.magnesium) || 0,
    }));

    return res.status(200).json({ items: validated });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: err.message });
  }
}
