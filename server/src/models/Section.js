import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
    },
    fromStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: [true, 'fromStation is required'],
    },
    toStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: [true, 'toStation is required'],
    },
    lengthKm: {
      type: Number,
      required: [true, 'Track length in km is required'],
      min: [0.1, 'Length must be at least 0.1 km'],
    },
    capacity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Capacity must be at least 1 train'],
    },
    lineType: {
      type: String,
      enum: {
        values: ['single', 'double'],
        message: 'Line type must be either single or double',
      },
      default: 'single',
    },
    maxSpeedKmph: {
      type: Number,
      required: true,
      default: 100,
      min: [10, 'Max speed must be at least 10 km/h'],
    },
  },
  {
    timestamps: true,
  }
);

const Section = mongoose.model('Section', sectionSchema);
export default Section;
