const Trip = require('../models/Trip');
const { generateTripPlan } = require('../services/aiService');

// @desc    Create a trip — generates itinerary/budget/hotels via Gemini, then saves
// @route   POST /api/trips
exports.createTrip = async (req, res) => {
  try {
    const { destination, durationDays, budgetTier, interests } = req.body;

    if (!destination || !durationDays || !budgetTier || !interests) {
      return res.status(400).json({ message: 'Missing required trip fields' });
    }

    const aiPlan = await generateTripPlan({ destination, durationDays, budgetTier, interests });

    const trip = await Trip.create({
      userId: req.user.id,
      destination,
      durationDays,
      budgetTier,
      interests,
      itinerary: aiPlan.itinerary,
      hotels: aiPlan.hotels,
      estimatedBudget: aiPlan.estimatedBudget,
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error.message);
    res.status(500).json({ message: 'Failed to generate trip. Please try again.' });
  }
};



// @desc    Get all trips belonging to the logged-in user
// @route   GET /api/trips
exports.getUserTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user.id });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching trips' });
  }
};

// @desc    Get a single trip by ID — only if it belongs to the logged-in user
// @route   GET /api/trips/:id
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching trip' });
  }
};

// @desc    Delete a trip — only if it belongs to the logged-in user
// @route   DELETE /api/trips/:id
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json({ message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting trip' });
  }
};

// @desc    Update trip itinerary/hotels/budget (generic update)
// @route   PUT /api/trips/:id
exports.updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating trip' });
  }
};

// @desc    Add an activity to a specific day
// @route   POST /api/trips/:id/activities
exports.addActivity = async (req, res) => {
  try {
    const { dayNumber, title, description, estimatedCostUSD, timeOfDay } = req.body;

    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({ message: `Day ${dayNumber} not found in itinerary` });
    }

    day.activities.push({ title, description, estimatedCostUSD: estimatedCostUSD || 0, timeOfDay: timeOfDay || 'Afternoon' });

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding activity' });
  }
};

// @desc    Remove an activity from a specific day
// @route   DELETE /api/trips/:id/activities/:activityId
exports.removeActivity = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Find which day contains this activity and remove it
    let removed = false;
    for (const day of trip.itinerary) {
      const index = day.activities.findIndex(
        (a) => a._id.toString() === req.params.activityId
      );
      if (index !== -1) {
        day.activities.splice(index, 1);
        removed = true;
        break;
      }
    }

    if (!removed) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: 'Server error removing activity' });
  }
};

// @desc    Regenerate a specific day with optional user instruction
// @route   POST /api/trips/:id/regenerate-day
exports.regenerateDay = async (req, res) => {
  try {
    const { dayNumber, instruction } = req.body;

    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Find the day FIRST before using it
    const day = trip.itinerary.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({ message: `Day ${dayNumber} not found` });
    }

    const existingActivities = day.activities.map((a) => a.title).join(', ');

    const apiKey = process.env.GROQ_API_KEY;
    const prompt = `You are a travel planner updating Day ${dayNumber} of a ${trip.durationDays}-day trip to ${trip.destination}.
Budget: ${trip.budgetTier}. Interests: ${trip.interests.join(', ')}.

Current activities already planned for this day: ${existingActivities}.
Keep these unless the instruction specifically asks to change them.
${instruction ? `User instruction: ${instruction}` : 'Improve the day while keeping existing activities.'}

Respond with ONLY valid JSON matching exactly this structure:
{
  "activities": [
    { "title": "string", "description": "string", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
  ]
}
Rules:
- Include the existing activities plus any additions from the instruction
- Use only these timeOfDay values: "Morning", "Afternoon", "Evening"
- Use realistic USD costs for a ${trip.budgetTier} budget traveler in ${trip.destination}
- Do NOT repeat activities already in other days`;

    const data = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    const result = await data.json();
    const rawText = result.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('No content from AI');

    const parsed = JSON.parse(rawText);

    day.activities = parsed.activities;
    await trip.save();

    res.status(200).json(trip);
  } catch (error) {
    console.error('Regenerate day error:', error.message);
    res.status(500).json({ message: 'Failed to regenerate day' });
  }
};