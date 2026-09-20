import mongoose from 'mongoose';

const trainRunSchema = new mongoose.Schema(
  {
    simulationId: {
      type: String,
      default: 'default',
      index: true,
    },
    train: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Train',
      required: [true, 'Train reference is required for a train run'],
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'running', 'delayed', 'completed', 'cancelled', 'held'],
        message: '{VALUE} is not a valid train run status',
      },
      default: 'scheduled',
    },
    currentSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [1, 'Progress cannot exceed 1.0 (100%)'],
    },
    delayMinutes: {
      type: Number,
      default: 0,
    },
    currentSpeedKmph: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one TrainRun per train per simulation instance
trainRunSchema.index({ simulationId: 1, train: 1 }, { unique: true });

const TrainRun = mongoose.model('TrainRun', trainRunSchema);
export default TrainRun;
