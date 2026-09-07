import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import Admin from './models/Admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://irshadvp800_db_user:GGGLYOlFnMHH5TEK@cluster0.yizgehu.mongodb.net/portfolio?retryWrites=true&w=majority';

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Portfolio API Backend with MongoDB & Country Analytics is running' });
});

// Seed default Admin user if none exists
async function seedDefaultAdmin() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new Admin({
        username: 'admin',
        password: 'admin123'
      });
      await defaultAdmin.save();
      console.log('🔑 Initial Admin Created: Username: admin | Password: admin123');
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  }
}

// Connect MongoDB and Start Server
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully!');
    await seedDefaultAdmin();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('Starting server in fallback mode...');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (MongoDB offline)`);
    });
  });
