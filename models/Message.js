const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: String,        // From localStorage in browser
  senderType: String,      // 'user' or 'admin'
  message: String,
  fileUrl: String,
  fileType: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
