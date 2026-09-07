import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  country: { type: String, default: 'Unknown Country' },
  countryCode: { type: String, default: 'UN' },
  city: { type: String, default: 'Unknown' },
  region: { type: String, default: 'Unknown' },
  userAgent: { type: String, default: '' },
  path: { type: String, default: '/' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Visitor', visitorSchema);
