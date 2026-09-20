import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Station code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Station name is required'],
      trim: true,
    },
    x: {
      type: Number,
      required: [true, 'X coordinate is required for network visualization'],
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required for network visualization'],
    },
  },
  {
    timestamps: true,
  }
);

const Station = mongoose.model('Station', stationSchema);
export default Station;
