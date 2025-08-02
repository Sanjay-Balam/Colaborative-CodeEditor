import { Schema, model, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  _id: string;
  documentId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientEmail: string;
  recipientId?: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  inviteToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  inviteToken: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
});

invitationSchema.index({ documentId: 1, recipientEmail: 1 });
invitationSchema.index({ inviteToken: 1 });
invitationSchema.index({ recipientId: 1 });
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Invitation = model<IInvitation>('Invitation', invitationSchema);