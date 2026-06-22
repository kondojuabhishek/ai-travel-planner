const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  estimatedCostUSD: { type: Number, default: 0 },
  actualCostUSD: { type: Number, default: null },
  timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Evening'] },
});

const TripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  destination: { type: String, required: true },
  durationDays: { type: Number, required: true },
  budgetTier: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  interests: [{ type: String }],
  itinerary: [{
    dayNumber: { type: Number, required: true },
    activities: [ActivitySchema],
  }],
  estimatedBudget: {
    transport: { type: Number, default: 0 },
    accommodation: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  hotels: [{
    name: { type: String, required: true },
    tier: { type: String },
    estimatedCostNightUSD: { type: Number },
    rating: { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);