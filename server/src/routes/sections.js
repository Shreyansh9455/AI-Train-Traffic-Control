import express from 'express';
import mongoose from 'mongoose';
import { Section, Station } from '../models/index.js';

const router = express.Router();

// GET /api/sections - Get all sections with populated stations
router.get('/', async (req, res, next) => {
  try {
    const sections = await Section.find()
      .populate('fromStation', 'code name x y')
      .populate('toStation', 'code name x y');
    res.status(200).json(sections);
  } catch (error) {
    next(error);
  }
});

// GET /api/sections/:id - Get single section by ID with populated stations
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid section ID format' });
    }

    const section = await Section.findById(id)
      .populate('fromStation', 'code name x y')
      .populate('toStation', 'code name x y');

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.status(200).json(section);
  } catch (error) {
    next(error);
  }
});

// POST /api/sections - Create a new section
router.post('/', async (req, res, next) => {
  try {
    const { fromStation, toStation, lengthKm, capacity, lineType, maxSpeedKmph } = req.body;

    if (!fromStation || !toStation) {
      return res.status(400).json({ error: 'fromStation and toStation are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(fromStation)) {
      return res.status(400).json({ error: 'fromStation is not a valid ObjectId' });
    }

    if (!mongoose.Types.ObjectId.isValid(toStation)) {
      return res.status(400).json({ error: 'toStation is not a valid ObjectId' });
    }

    if (String(fromStation) === String(toStation)) {
      return res.status(400).json({ error: 'fromStation and toStation must be different' });
    }

    if (lengthKm === undefined || lengthKm === null || isNaN(Number(lengthKm)) || Number(lengthKm) <= 0) {
      return res.status(400).json({ error: 'lengthKm must be a positive number' });
    }

    // Verify stations exist
    const fromExists = await Station.findById(fromStation);
    if (!fromExists) {
      return res.status(400).json({ error: 'fromStation does not exist' });
    }

    const toExists = await Station.findById(toStation);
    if (!toExists) {
      return res.status(400).json({ error: 'toStation does not exist' });
    }

    const section = await Section.create({
      fromStation,
      toStation,
      lengthKm: Number(lengthKm),
      capacity: capacity !== undefined ? Number(capacity) : 1,
      lineType: lineType || 'single',
      maxSpeedKmph: maxSpeedKmph !== undefined ? Number(maxSpeedKmph) : 100,
    });

    const populated = await Section.findById(section._id)
      .populate('fromStation', 'code name x y')
      .populate('toStation', 'code name x y');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

// PUT /api/sections/:id - Update an existing section
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid section ID format' });
    }

    const { fromStation, toStation, lengthKm, capacity, lineType, maxSpeedKmph } = req.body;
    const updateData = {};

    if (fromStation !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(fromStation)) {
        return res.status(400).json({ error: 'fromStation is not a valid ObjectId' });
      }
      const fromExists = await Station.findById(fromStation);
      if (!fromExists) {
        return res.status(400).json({ error: 'fromStation does not exist' });
      }
      updateData.fromStation = fromStation;
    }

    if (toStation !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(toStation)) {
        return res.status(400).json({ error: 'toStation is not a valid ObjectId' });
      }
      const toExists = await Station.findById(toStation);
      if (!toExists) {
        return res.status(400).json({ error: 'toStation does not exist' });
      }
      updateData.toStation = toStation;
    }

    const effectiveFrom = updateData.fromStation || (await Section.findById(id))?.fromStation;
    const effectiveTo = updateData.toStation || (await Section.findById(id))?.toStation;

    if (effectiveFrom && effectiveTo && String(effectiveFrom) === String(effectiveTo)) {
      return res.status(400).json({ error: 'fromStation and toStation must be different' });
    }

    if (lengthKm !== undefined) {
      if (isNaN(Number(lengthKm)) || Number(lengthKm) <= 0) {
        return res.status(400).json({ error: 'lengthKm must be a positive number' });
      }
      updateData.lengthKm = Number(lengthKm);
    }

    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (lineType !== undefined) updateData.lineType = lineType;
    if (maxSpeedKmph !== undefined) updateData.maxSpeedKmph = Number(maxSpeedKmph);

    const section = await Section.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('fromStation', 'code name x y')
      .populate('toStation', 'code name x y');

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.status(200).json(section);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sections/:id - Delete a section
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid section ID format' });
    }

    const section = await Section.findByIdAndDelete(id);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.status(200).json({ message: 'Section deleted', id });
  } catch (error) {
    next(error);
  }
});

export default router;
