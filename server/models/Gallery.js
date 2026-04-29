const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  label:     { type: String, required: true, trim: true },
  imageUrl:  { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', gallerySchema);
