import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Visitor from '../models/Visitor.js';
import ContactMessage from '../models/ContactMessage.js';
import Admin from '../models/Admin.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'irshad_portfolio_admin_secret_key_2026';

// Middleware to verify Admin JWT Token
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized - No Token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

// IP Geolocation Helper
async function getGeoData(ip) {
  try {
    // Handle localhost / private IPs
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', region: 'Dubai' };
    }
    const cleanIp = ip.split(',')[0].trim();
    const res = await axios.get(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,city,regionName`, { timeout: 3000 });
    if (res.data && res.data.status === 'success') {
      return {
        country: res.data.country || 'Unknown Country',
        countryCode: res.data.countryCode || 'UN',
        city: res.data.city || 'Unknown',
        region: res.data.regionName || 'Unknown'
      };
    }
  } catch (err) {
    console.error('Geo IP lookup fallback:', err.message);
  }
  return { country: 'United Arab Emirates', countryCode: 'AE', city: 'Dubai', region: 'Dubai' };
}

// ==================== PUBLIC ROUTES ====================

// 1. Silent Visitor & Country Logging Endpoint
router.post('/visit', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    const path = req.body.path || '/';

    const geo = await getGeoData(clientIp);

    const visitor = new Visitor({
      ip: clientIp,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      userAgent,
      path
    });

    await visitor.save();
    res.json({ success: true, country: geo.country, countryCode: geo.countryCode });
  } catch (err) {
    console.error('Error logging visit:', err);
    res.status(500).json({ success: false, message: 'Server error logging visit' });
  }
});

// 2. Submit Contact Form Message
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const geo = await getGeoData(clientIp);

    const contactMsg = new ContactMessage({
      name,
      email,
      subject: subject || 'Portfolio Contact',
      message,
      ip: clientIp,
      country: geo.country,
      countryCode: geo.countryCode
    });

    await contactMsg.save();
    res.json({ success: true, message: 'Message sent and stored successfully!' });
  } catch (err) {
    console.error('Error saving contact message:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// 3. Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    let admin = await Admin.findOne({ username });

    // Seed default admin if none exists
    if (!admin && username === 'admin') {
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        admin = new Admin({ username: 'admin', password: 'admin123' });
        await admin.save();
      }
    }

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ==================== PROTECTED ADMIN ROUTES ====================

// 4. Get Admin Dashboard Analytics & Country Breakdown
router.get('/admin/analytics', authMiddleware, async (req, res) => {
  try {
    const totalVisits = await Visitor.countDocuments();
    const totalMessages = await ContactMessage.countDocuments();
    const unreadMessages = await ContactMessage.countDocuments({ isRead: false });

    // Country Breakdown Aggregation
    const countryStats = await Visitor.aggregate([
      {
        $group: {
          _id: { country: '$country', countryCode: '$countryCode' },
          count: { $sum: 1 },
          lastVisited: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Format countries array
    const countries = countryStats.map(item => ({
      country: item._id.country || 'Unknown Country',
      countryCode: item._id.countryCode || 'UN',
      count: item.count,
      lastVisited: item.lastVisited
    }));

    // Recent 20 visitors
    const recentVisitors = await Visitor.find()
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({
      success: true,
      stats: {
        totalVisits,
        totalMessages,
        unreadMessages,
        uniqueCountriesCount: countries.length
      },
      countries,
      recentVisitors
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// 5. Get Contact Messages Inbox
router.get('/admin/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// 6. Toggle Read Status of Message
router.patch('/admin/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    const msg = await ContactMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    msg.isRead = !msg.isRead;
    await msg.save();
    res.json({ success: true, isRead: msg.isRead });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update message' });
  }
});

// 7. Delete Message
router.delete('/admin/messages/:id', authMiddleware, async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

// 8. Update Admin Username / Password
router.put('/admin/change-password', authMiddleware, async (req, res) => {
  try {
    const { newUsername, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    }

    if (newUsername && newUsername.trim() !== '') {
      admin.username = newUsername.trim();
    }

    if (newPassword && newPassword.trim() !== '') {
      admin.password = newPassword.trim();
    }

    admin.updatedAt = new Date();
    await admin.save();

    res.json({ success: true, message: 'Admin credentials updated successfully!', username: admin.username });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: 'Failed to update credentials' });
  }
});

export default router;
