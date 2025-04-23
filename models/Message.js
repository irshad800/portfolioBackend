// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderType: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String },
  fileUrl: { type: String },
  fileType: { type: String },
  read: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
