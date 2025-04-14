const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: String,
  senderType: String,
  message: String,
  fileUrl: String,
  fileType: String,
  read: {
    type: Boolean,
    default: false, // all messages start as unread
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
