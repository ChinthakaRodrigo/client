
const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    busType: {
      type: String,
      enum: ["NORMAL", "SEMI_LUXURY", "LUXURY"],
      default: "NORMAL"
    },

    capacity: {
      type: Number,
      required: true,
      min: 1
    },

    status: {
      type: String,
      enum: ["ACTIVE", "MAINTENANCE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", busSchema);
