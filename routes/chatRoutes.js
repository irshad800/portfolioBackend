const express = require('express');
const path = require('path');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Message = require('../models/Message');

const router = express.Router();

// 🔐 Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📦 Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat_uploads',
    allowed_formats: ['jpg', 'png', 'pdf', 'mp4'], // add more if needed
  },
});

const upload = multer({ storage });

/**
 * 📥 GET all messages
 */
router.get('/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 📥 GET unread messages
 */
router.get('/messages/unread', async (req, res) => {
  try {
    const unreadMessages = await Message.find({ read: false }).sort({ createdAt: 1 });
    res.json(unreadMessages);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 📤 POST send message with file(s)
 */
router.post('/send', upload.array('files', 5), async (req, res) => {
  try {
    const { senderId, senderType, message } = req.body;

    let fileData = [];

    if (req.files && req.files.length > 0) {
      fileData = req.files.map(file => ({
        fileUrl: file.path,
        fileType: file.mimetype,
      }));
    }

    const newMsg = new Message({
      senderId,
      senderType,
      message,
      fileUrl: fileData.length ? fileData[0].fileUrl : null,
      fileType: fileData.length ? fileData[0].fileType : null,
      read: false, // default unread
    });

    await newMsg.save();

    res.json({ success: true, data: newMsg, files: fileData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * ✅ PUT mark message as read/unread
 */
router.put('/messages/:id/read', async (req, res) => {
  try {
    const { read } = req.body;

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
