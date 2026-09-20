import express from 'express';
import mongoose from 'mongoose';
import { Train, Station } from '../models/index.js';

const router = express.Router();
const VALID_TYPES = ['express', 'passenger', 'freight'];

// Helper to validate route stations
async function validateRouteStations(route) {
  if (!Array.isArray(route) || route.length < 2) {
    return { valid: false, message: 'route must be an array with at least 2 stops' };
  }

  for (let i = 0; i < route.length; i++) {
    const stop = route[i];
    if (!stop.station) {
      return { valid: false, message: `Stop ${i + 1} is missing station ID` };
    }
    if (!mongoose.Types.ObjectId.isValid(stop.station)) {
      return { valid: false, message: `Stop ${i + 1} station ID "${stop.station}" is not a valid ObjectId` };
    }
    const stationExists = await Station.findById(stop.station);
    if (!stationExists) {
      return { valid: false, message: `Station with ID "${stop.station}" at stop ${i + 1} does not exist` };
    }
    if (stop.arrivalTimeMinutes === undefined || stop.departureTimeMinutes === undefined) {
      return { valid: false, message: `Stop ${i + 1} must include arrivalTimeMinutes and departureTimeMinutes` };
    }
  }

  return { valid: true };
}

// GET /api/trains - Get all trains with populated route stations
router.get('/', async (req, res, next) => {
  try {
    const trains = await Train.find()
      .populate('route.station', 'code name x y')
      .sort({ priority: 1, trainNumber: 1 });
    res.status(200).json(trains);
  } catch (error) {
    next(error);
  }
});

// GET /api/trains/:id - Get single train by ID with populated route stations
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid train ID format' });
    }

    const train = await Train.findById(id).populate('route.station', 'code name x y');
    if (!train) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.status(200).json(train);
  } catch (error) {
    next(error);
  }
});

// POST /api/trains - Create a new train
router.post('/', async (req, res, next) => {
  try {
    const { trainNumber, name, type, priority, route, maxSpeedKmph } = req.body;

    if (!trainNumber || !name || !type || priority === undefined) {
      return res.status(400).json({ error: 'trainNumber, name, type, and priority are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type must be express, passenger, or freight' });
    }

    if (![1, 2, 3].includes(Number(priority))) {
      return res.status(400).json({ error: 'priority must be 1 (Express), 2 (Passenger), or 3 (Freight)' });
    }

    const normalizedNumber = String(trainNumber).trim().toUpperCase();
    const existing = await Train.findOne({ trainNumber: normalizedNumber });
    if (existing) {
      return res.status(409).json({ error: `Train with number "${normalizedNumber}" already exists` });
    }

    const routeValidation = await validateRouteStations(route);
    if (!routeValidation.valid) {
      return res.status(400).json({ error: routeValidation.message });
    }

    const train = await Train.create({
      trainNumber: normalizedNumber,
      name: String(name).trim(),
      type,
      priority: Number(priority),
      route,
      maxSpeedKmph: maxSpeedKmph !== undefined ? Number(maxSpeedKmph) : 100,
    });

    const populated = await Train.findById(train._id).populate('route.station', 'code name x y');
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Train with this number already exists' });
    }
    next(error);
  }
});

// PUT /api/trains/:id - Update an existing train
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid train ID format' });
    }

    const { trainNumber, name, type, priority, route, maxSpeedKmph } = req.body;
    const updateData = {};

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'type must be express, passenger, or freight' });
      }
      updateData.type = type;
    }

    if (priority !== undefined) {
      if (![1, 2, 3].includes(Number(priority))) {
        return res.status(400).json({ error: 'priority must be 1 (Express), 2 (Passenger), or 3 (Freight)' });
      }
      updateData.priority = Number(priority);
    }

    if (trainNumber !== undefined) {
      const normalizedNumber = String(trainNumber).trim().toUpperCase();
      const existing = await Train.findOne({ trainNumber: normalizedNumber, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ error: `Train with number "${normalizedNumber}" already exists` });
      }
      updateData.trainNumber = normalizedNumber;
    }

    if (name !== undefined) updateData.name = String(name).trim();
    if (maxSpeedKmph !== undefined) updateData.maxSpeedKmph = Number(maxSpeedKmph);

    if (route !== undefined) {
      const routeValidation = await validateRouteStations(route);
      if (!routeValidation.valid) {
        return res.status(400).json({ error: routeValidation.message });
      }
      updateData.route = route;
    }

    const train = await Train.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('route.station', 'code name x y');

    if (!train) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.status(200).json(train);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Train with this number already exists' });
    }
    next(error);
  }
});

// DELETE /api/trains/:id - Delete a train
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid train ID format' });
    }

    const train = await Train.findByIdAndDelete(id);
    if (!train) {
      return res.status(404).json({ error: 'Train not found' });
    }

    res.status(200).json({ message: 'Train deleted', id });
  } catch (error) {
    next(error);
  }
});

export default router;
