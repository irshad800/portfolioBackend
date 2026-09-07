import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, default: 'General Inquiry' },
  message: { type: String, required: true },
  ip: { type: String, default: 'Unknown' },
  country: { type: String, default: 'Unknown' },
  countryCode: { type: String, default: 'UN' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ContactMessage', contactMessageSchema);
