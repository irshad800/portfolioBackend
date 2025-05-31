// 📁 routes/chat.js

const express = require('express');
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
  cloudinary,
  params: {
    folder: 'support_chat_uploads',
    allowed_formats: ['jpg', 'png', 'pdf', 'mp4'],
  },
});

const upload = multer({ storage });

// ✅ Send message (text/file or both)
router.post('/send', upload.array('files', 5), async (req, res) => {
  try {
    const { senderId, senderType } = req.body;
    const message = req.body.message || '';

    if (!message && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, error: 'Message or file is required.' });
    }

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
      fileUrl: fileData[0]?.fileUrl || null,
      fileType: fileData[0]?.fileType || null,
      read: false,
    });

    await newMsg.save();
    res.json({ success: true, data: newMsg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Get messages for specific user
router.get('/messages/:senderId', async (req, res) => {
  try {
    const userId = req.params.senderId;
    console.log("📩 Getting messages for:", userId); // Log incoming request

    const messages = await Message.find({
      $or: [
        { senderId: userId, senderType: 'user' },
        { senderId: userId, senderType: 'admin' }
      ]
    }).sort({ createdAt: 1 });

    console.log("📦 Messages found:", messages); // Log result
    res.json(messages);
  } catch (err) {
    console.error("❌ Error in /messages/:senderId:", err); // Log error
    res.status(500).json({ success: false, error: err.message });
  }
});


// ✅ Get unique users list for admin with unread count
router.get('/users', async (req, res) => {
  try {
    const users = await Message.aggregate([
      { $match: { senderType: 'user' } },
      {
        $group: {
          _id: '$senderId',
          lastMessage: { $last: "$message" },
          lastTime: { $last: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ["$read", false] }, 1, 0]
            }
          }
        }
      },
      { $sort: { lastTime: -1 } }
    ]);

    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Mark all user messages as read (admin views chat)
router.put('/mark-read/:senderId', async (req, res) => {
  try {
    await Message.updateMany(
      { senderId: req.params.senderId, senderType: 'user', read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Mark all admin messages as read (user views chat)
router.put('/user-mark-read/:senderId', async (req, res) => {
  try {
    await Message.updateMany(
      { senderId: req.params.senderId, senderType: 'admin', read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
