const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createTrip,
  getUserTrips,
  getTripById,
  deleteTrip,
} = require('../controllers/tripController');

// Every route below requires a valid JWT
router.use(auth);

router.post('/', createTrip);
router.get('/', getUserTrips);
router.get('/:id', getTripById);
router.delete('/:id', deleteTrip);

module.exports = router;