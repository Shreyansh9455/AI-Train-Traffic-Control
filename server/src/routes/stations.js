import express from 'express';
import mongoose from 'mongoose';
import { Station } from '../models/index.js';

const router = express.Router();

// GET /api/stations - Get all stations
router.get('/', async (req, res, next) => {
  try {
    const stations = await Station.find().sort({ code: 1 });
    res.status(200).json(stations);
  } catch (error) {
    next(error);
  }
});

// GET /api/stations/:id - Get single station by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid station ID format' });
    }

    const station = await Station.findById(id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.status(200).json(station);
  } catch (error) {
    next(error);
  }
});

// POST /api/stations - Create a new station
router.post('/', async (req, res, next) => {
  try {
    const { code, name, x, y } = req.body;

    if (!code || !name || typeof code !== 'string' || typeof name !== 'string' || !code.trim() || !name.trim()) {
      return res.status(400).json({ error: 'code and name are required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await Station.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(409).json({ error: `Station with code "${normalizedCode}" already exists` });
    }

    const station = await Station.create({
      code: normalizedCode,
      name: name.trim(),
      x: x !== undefined ? Number(x) : 0,
      y: y !== undefined ? Number(y) : 0,
    });

    res.status(201).json(station);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Station with this code already exists' });
    }
    next(error);
  }
});

// PUT /api/stations/:id - Update an existing station
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid station ID format' });
    }

    const { code, name, x, y } = req.body;
    const updateData = {};

    if (code !== undefined) {
      if (typeof code !== 'string' || !code.trim()) {
        return res.status(400).json({ error: 'code cannot be empty' });
      }
      const normalizedCode = code.trim().toUpperCase();
      const existing = await Station.findOne({ code: normalizedCode, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ error: `Station with code "${normalizedCode}" already exists` });
      }
      updateData.code = normalizedCode;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      updateData.name = name.trim();
    }

    if (x !== undefined) updateData.x = Number(x);
    if (y !== undefined) updateData.y = Number(y);

    const station = await Station.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.status(200).json(station);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Station with this code already exists' });
    }
    next(error);
  }
});

// DELETE /api/stations/:id - Delete a station
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid station ID format' });
    }

    const station = await Station.findByIdAndDelete(id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.status(200).json({ message: 'Station deleted', id });
  } catch (error) {
    next(error);
  }
});

export default router;
