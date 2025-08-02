import { Schema, model, Document as MongoDocument, Types } from 'mongoose';

export interface IDocument extends MongoDocument {
  _id: string;
  title: string;
  language: string;
  content: string;
  yjsState: Buffer;
  owner: Types.ObjectId;
  collaborators: Types.ObjectId[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  language: {
    type: String,
    required: true,
    default: 'javascript',
    enum: ['javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown']
  },
  content: {
    type: String,
    default: ''
  },
  yjsState: {
    type: Buffer,
    default: null
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

documentSchema.index({ owner: 1 });
documentSchema.index({ collaborators: 1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ title: 'text', content: 'text' });

export const Document = model<IDocument>('Document', documentSchema);