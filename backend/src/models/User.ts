import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  username: string;
  password: string;
  plainPassword: string; // Store plain text password for admin viewing
  role: 'admin' | 'student';
  progress: number[];
  starred: number[];
  notes: Map<number, string>;
  checkIns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  plainPassword: {
    type: String,
    required: true,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student'
  },
  progress: {
    type: [Number],
    default: []
  },
  starred: {
    type: [Number],
    default: []
  },
  notes: {
    type: Map,
    of: String,
    default: new Map()
  },
  checkIns: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);
