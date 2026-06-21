const Trip = require('../models/Trip');

// @desc    Create a new trip (itinerary/budget/hotels filled in later by AI)
// @route   POST /api/trips
exports.createTrip = async (req, res) => {
  try {
    const { destination, durationDays, budgetTier, interests } = req.body;

    const trip = await Trip.create({
      userId: req.user.id, // comes from the decoded JWT, NEVER from req.body
      destination,
      durationDays,
      budgetTier,
      interests,
      itinerary: [],
      estimatedBudget: {},
      hotels: [],
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error('Create trip error:', error.message);
    res.status(500).json({ message: 'Server error creating trip' });
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