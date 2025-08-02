import * as Y from 'yjs';
import { Document } from '../models/Document';
import { Types } from 'mongoose';

export class YjsService {
  private documents = new Map<string, Y.Doc>();

  async getOrCreateDocument(documentId: string): Promise<Y.Doc> {
    let ydoc = this.documents.get(documentId);
    
    if (!ydoc) {
      ydoc = new Y.Doc();
      this.documents.set(documentId, ydoc);
      
      // Load existing state from MongoDB
      try {
        const doc = await Document.findById(documentId);
        if (doc && doc.yjsState) {
          Y.applyUpdate(ydoc, doc.yjsState);
        }
      } catch (error) {
        console.error('Error loading document state:', error);
      }
    }
    
    return ydoc;
  }

  async saveDocument(documentId: string, ydoc: Y.Doc): Promise<void> {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      const text = ydoc.getText('monaco').toString();
      
      await Document.findByIdAndUpdate(
        documentId,
        {
          yjsState: state,
          content: text,
          updatedAt: new Date()
        },
        { upsert: false }
      );
    } catch (error) {
      console.error('Error saving document state:', error);
    }
  }

  async createDocument(title: string, language: string, ownerId: string): Promise<string> {
    try {
      const doc = new Document({
        title,
        language,
        content: '',
        owner: new Types.ObjectId(ownerId),
        collaborators: [],
        isPublic: false
      });
      
      await doc.save();
      
      // Initialize Y.js document
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText('monaco');
      ytext.insert(0, '// Welcome to the collaborative editor!\n// Start typing to see real-time collaboration in action.\n\n');
      
      // Save initial state
      const state = Y.encodeStateAsUpdate(ydoc);
      doc.yjsState = state;
      doc.content = ytext.toString();
      await doc.save();
      
      this.documents.set(doc._id.toString(), ydoc);
      
      return doc._id.toString();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  removeDocument(documentId: string): void {
    this.documents.delete(documentId);
  }

  getAllDocuments(): Map<string, Y.Doc> {
    return this.documents;
  }
}