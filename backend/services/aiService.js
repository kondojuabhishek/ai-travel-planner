async function fetchWithRetry(url, options, retries = 5, delay = 1000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      const errorBody = await response.text();
      throw new Error(`AI API error ${response.status}: ${errorBody}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function generateTripPlan({ destination, durationDays, budgetTier, interests }) {
  const apiKey = process.env.GROQ_API_KEY;
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const prompt = `Create a detailed ${durationDays}-day travel itinerary for a trip to ${destination}.
Budget preference: ${budgetTier}. Traveler interests: ${interests.join(', ')}.

Respond with ONLY valid JSON, no markdown, no extra text, matching exactly this structure:
{
  "itinerary": [
    { "dayNumber": 1, "activities": [ { "title": "string", "description": "string", "estimatedCostUSD": 20, "timeOfDay": "Morning" } ] }
  ],
  "hotels": [
    { "name": "string", "tier": "Budget", "estimatedCostNightUSD": 80, "rating": "4.2/5" }
  ],
  "estimatedBudget": {
    "transport": 200, "accommodation": 300, "food": 150, "activities": 100, "total": 750
  }
}

Rules:
- Generate exactly ${durationDays} day entries
- Each day must have 2-4 activities using only these timeOfDay values: "Morning", "Afternoon", "Evening"
- Use realistic USD costs for a ${budgetTier} budget traveler in ${destination}
- Suggest exactly 3 hotels covering Budget, Mid-range, and Luxury tiers`;

  const requestPayload = {
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestPayload),
  });

  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('Groq returned no usable content');
  }

  return JSON.parse(rawText);
}

module.exports = { generateTripPlan };