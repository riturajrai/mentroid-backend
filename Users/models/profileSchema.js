const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentWhatsapp: {
      type: String,
      required: true,
    },
    parentWhatsapp: String,
    schoolName: String,
    board: {
      type: String,
      enum: ["CBSE", "ICSE", "State Board", "Other"],
    },
    class: String,
    profileImage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
