import mongoose from 'mongoose';

const routeStopSchema = new mongoose.Schema(
  {
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: [true, 'Station reference is required for route stop'],
    },
    arrivalTimeMinutes: {
      type: Number,
      required: [true, 'Arrival time in minutes is required'],
    },
    departureTimeMinutes: {
      type: Number,
      required: [true, 'Departure time in minutes is required'],
    },
    stopDurationMinutes: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const trainSchema = new mongoose.Schema(
  {
    trainNumber: {
      type: String,
      required: [true, 'Train number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Train name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Train type is required'],
      enum: {
        values: ['express', 'passenger', 'freight'],
        message: '{VALUE} is not a valid train type',
      },
    },
    priority: {
      type: Number,
      required: [true, 'Train priority is required'],
      enum: {
        values: [1, 2, 3],
        message: 'Priority must be 1 (Express), 2 (Passenger), or 3 (Freight)',
      },
    },
    route: {
      type: [routeStopSchema],
      required: [true, 'Route stops are required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length >= 2;
        },
        message: 'A train route must contain at least 2 station stops',
      },
    },
    maxSpeedKmph: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

const Train = mongoose.model('Train', trainSchema);
export default Train;
