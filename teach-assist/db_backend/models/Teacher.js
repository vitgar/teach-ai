const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema({
  firstName: { type: String },
  middleInitial: { type: String },
  lastName: { type: String },
  address: { type: String },
  schoolDistrict: { type: String },
  gradeLevel: { type: String },
  schoolAddress: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String },
  linkedinId: { type: String },
  teachingStandards: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Standard" }
  ],
  standardizedTests: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StandardizedTest',
    required: false
  },
  state: { type: String },
  googleId: {
    type: String,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  subscription: {
    status: { type: String, enum: ['active', 'cancelled', 'none'], default: 'none' },
    plan: { type: String, enum: ['monthly', 'yearly', 'none'], default: 'none' },
    subscriptionId: { type: String },
    nextBillingDate: { type: Date }
  },
  paymentProviders: {
    gocardless: {
      customerId: { type: String },
      mandateId: { type: String }
    }
  }
});

// Enable debugging
mongoose.set('debug', true);

module.exports = mongoose.models.Teacher || mongoose.model("Teacher", TeacherSchema);
