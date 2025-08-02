import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

userSchema.index({ email: 1 });

export const User = model<IUser>('User', userSchema);