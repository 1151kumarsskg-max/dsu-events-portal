const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  category:   { type: String, enum: ['technical','cultural','sports','workshop','seminar'], required: true },
  date:       { type: String, required: true },   // "YYYY-MM-DD"
  time:       { type: String, required: true },   // "HH:MM"
  venue:      { type: String, required: true, trim: true },
  organizer:  { type: String, required: true, trim: true },
  desc:       { type: String, default: '' },
  seats:      { type: Number, required: true, min: 1 },
  registered: { type: Number, default: 0 },
  fee:        { type: String, default: 'Free' },
  icon:       { type: String, default: '🎉' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Virtual: seats left
eventSchema.virtual('seatsLeft').get(function () {
  return this.seats - this.registered;
});

eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
