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