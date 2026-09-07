import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Visitor from './models/Visitor.js';
import ContactMessage from './models/ContactMessage.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://irshadvp800_db_user:GGGLYOlFnMHH5TEK@cluster0.yizgehu.mongodb.net/portfolio?retryWrites=true&w=majority';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas!');

    const visitorCount = await Visitor.countDocuments();
    const messageCount = await ContactMessage.countDocuments();

    console.log(`Current Test Data: ${visitorCount} Visitors, ${messageCount} Contact Messages.`);

    await Visitor.deleteMany({});
    await ContactMessage.deleteMany({});

    console.log('✅ SUCCESS: Deleted all test visitor and contact message records from MongoDB Atlas!');
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB Atlas.');
    process.exit(0);
  }
}

clearDatabase();
