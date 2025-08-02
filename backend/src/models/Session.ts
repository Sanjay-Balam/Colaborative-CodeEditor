import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  _id: string;
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  socketId: string;
  cursor: {
    line: number;
    column: number;
  };
  isActive: boolean;
  joinedAt: Date;
  lastSeen: Date;
}

const sessionSchema = new Schema<ISession>({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  cursor: {
    line: {
      type: Number,
      default: 0
    },
    column: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
});

sessionSchema.index({ documentId: 1, isActive: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ socketId: 1 });

export const Session = model<ISession>('Session', sessionSchema);