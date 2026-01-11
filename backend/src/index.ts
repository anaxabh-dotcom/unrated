import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, IUser } from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/learningPlatform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'https://unrated-cbpus.vercel.app'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await initializeDefaultUsers();
    console.log('✅ User initialization complete');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('CRITICAL: Application may not function properly without database connection');
  });

// Initialize default admin and student users
async function initializeDefaultUsers() {
  try {
    // CRITICAL: Always ensure admin exists with correct credentials
    const adminUsername = 'abhayverma5545';
    const adminPlainPassword = 'Ananya123';
    
    const adminExists = await User.findOne({ username: adminUsername });
    const hashedPassword = await bcrypt.hash(adminPlainPassword, 10);
    
    if (!adminExists) {
      // Create admin if doesn't exist
      await User.create({
        username: adminUsername,
        password: hashedPassword,
        plainPassword: adminPlainPassword,
        role: 'admin'
      });
      console.log('✅ Default admin user created: abhayverma5545');
    } else {
      // Update admin password to ensure it's correct (important for deployments)
      adminExists.password = hashedPassword;
      adminExists.plainPassword = adminPlainPassword;
      adminExists.role = 'admin';
      await adminExists.save();
      console.log('✅ Admin credentials verified and updated');
    }

    // Check if default student exists
    const studentExists = await User.findOne({ username: 'student' });
    if (!studentExists) {
      const plainPassword = 'password';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await User.create({
        username: 'student',
        password: hashedPassword,
        plainPassword: plainPassword,
        role: 'student',
        progress: [],
        starred: [],
        notes: new Map(),
        checkIns: []
      });
      console.log('✅ Default student user created');
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR initializing default users:', error);
    console.error('Admin login may not work! Please check database connection.');
  }
}

// --- MIDDLEWARE ---

// Authentication middleware to verify user role
interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

const authenticateAdmin = async (req: AuthRequest, res: Response, next: Function): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Unauthorized - No token provided' });
    }

    // Extract userId from Authorization header (format: "Bearer userId")
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token format' });
    }

    const user = await User.findById(token);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized - Invalid user' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden - Admin access required' });
    }

    req.userId = user._id.toString();
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });
  }
};

// --- API ROUTES ---

// Login
app.post('/api/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Special handling for admin to ensure it always works
    if (username === 'abhayverma5545' && password === 'Ananya123') {
      let user = await User.findOne({ username: 'abhayverma5545' });
      
      // If admin doesn't exist, create it immediately
      if (!user) {
        console.log('⚠️ Admin not found during login, creating now...');
        const hashedPassword = await bcrypt.hash('Ananya123', 10);
        user = await User.create({
          username: 'abhayverma5545',
          password: hashedPassword,
          plainPassword: 'Ananya123',
          role: 'admin'
        });
        console.log('✅ Admin user created during login');
      }

      // Ensure daily check-in for admin
      const today = new Date().toISOString().split('T')[0];
      if (!user.checkIns.includes(today)) {
        user.checkIns.push(today);
        await user.save();
      }

      const userResponse = {
        _id: user._id,
        username: user.username,
        role: user.role,
        progress: user.progress || [],
        starred: user.starred || [],
        notes: user.notes ? Object.fromEntries(user.notes) : {},
        checkIns: user.checkIns || []
      };

      console.log('✅ Admin login successful: abhayverma5545');
      return res.json({ success: true, user: userResponse });
    }

    // Regular user login
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`❌ Login failed: User not found - ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Daily Check-in Logic
    const today = new Date().toISOString().split('T')[0];
    if (!user.checkIns.includes(today)) {
      user.checkIns.push(today);
      await user.save();
    }

    // Return user without password (exclude plainPassword for students)
    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns
    };

    console.log(`✅ Login successful: ${user.username} (${user.role})`);
    res.json({ success: true, user: userResponse });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Get all users (admin only - PROTECTED)
app.get('/api/users', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    // Select all fields except the hashed password, include plainPassword for admin
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new user (admin only - PROTECTED)
app.post('/api/users', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password, role, totalPaid, paymentDate, paymentDescription } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Initialize payment if provided
    const payments = [];
    const initialPaid = totalPaid || 0;
    if (initialPaid > 0) {
      payments.push({
        amount: initialPaid,
        date: paymentDate || new Date().toISOString().split('T')[0],
        description: paymentDescription || 'Initial payment'
      });
    }
    
    const newUser = await User.create({
      username,
      password: hashedPassword,
      plainPassword: password,
      role: role || 'student',
      progress: [],
      starred: [],
      notes: new Map(),
      checkIns: [],
      totalPaid: initialPaid,
      payments: payments
    });

    const userResponse = {
      _id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      progress: newUser.progress,
      starred: newUser.starred,
      notes: Object.fromEntries(newUser.notes),
      checkIns: newUser.checkIns
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user (admin only - PROTECTED)
app.delete('/api/users/:id', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user password (admin only - PROTECTED)
app.put('/api/users/:id/password', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.plainPassword = password;
    await user.save();

    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      plainPassword: user.plainPassword,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user payment (admin only - PROTECTED)
app.put('/api/users/:id/payment', authenticateAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { amount, date, description, action } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'add' && amount) {
      // Add new payment
      const newPayment = {
        amount: parseFloat(amount),
        date: date || new Date().toISOString().split('T')[0],
        description: description || 'Payment received'
      };
      user.payments.push(newPayment);
      user.totalPaid = (user.totalPaid || 0) + parseFloat(amount);
    } else if (action === 'set' && amount !== undefined) {
      // Set total amount (recalculate)
      user.totalPaid = parseFloat(amount);
    }

    await user.save();

    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      plainPassword: user.plainPassword,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns,
      totalPaid: user.totalPaid,
      payments: user.payments
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    console.error('Payment update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user progress
app.put('/api/users/:id/progress', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { videoId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.progress.includes(videoId)) {
      user.progress.push(videoId);
      await user.save();
    }

    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle starred video
app.put('/api/users/:id/starred', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { videoId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const index = user.starred.indexOf(videoId);
    if (index > -1) {
      user.starred.splice(index, 1);
    } else {
      user.starred.push(videoId);
    }
    await user.save();

    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save note
app.put('/api/users/:id/notes', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { videoId, content } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.notes.set(videoId, content);
    await user.save();

    const userResponse = {
      _id: user._id,
      username: user.username,
      role: user.role,
      progress: user.progress,
      starred: user.starred,
      notes: Object.fromEntries(user.notes),
      checkIns: user.checkIns
    };

    res.json({ success: true, user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Check if admin exists
    const adminExists = await User.findOne({ username: 'abhayverma5545' });
    
    res.json({ 
      success: true, 
      message: 'Server is running',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      adminExists: !!adminExists,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${FRONTEND_URL}`);
});
