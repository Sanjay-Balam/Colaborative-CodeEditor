import { Elysia, t } from 'elysia';
import { Document } from '../models/Document';
import { YjsService } from '../services/YjsService';
import { requireAuth, authMiddleware } from '../middleware/auth';
import { Types } from 'mongoose';

const yjsService = new YjsService();

export const documentRoutes = new Elysia({ prefix: '/api/documents' })
  
  // Get user's documents
  .use(requireAuth)
  .get('/', async ({ user }) => {
    try {
      const documents = await Document.find({
        $or: [
          { owner: user._id },
          { collaborators: user._id },
          { isPublic: true }
        ]
      })
      .populate('owner', 'name email avatar')
      .populate('collaborators', 'name email avatar')
      .sort({ updatedAt: -1 });

      return { documents };
    } catch (error) {
      console.error('Error fetching documents:', error);
      return { error: 'Failed to fetch documents' };
    }
  })

  // Create new document
  .post('/', async ({ user, body }) => {
    try {
      const documentId = await yjsService.createDocument(
        body.title,
        body.language,
        user._id.toString()
      );

      const document = await Document.findById(documentId)
        .populate('owner', 'name email avatar');

      return { document };
    } catch (error) {
      console.error('Error creating document:', error);
      return { error: 'Failed to create document' };
    }
  }, {
    body: t.Object({
      title: t.String(),
      language: t.Optional(t.String())
    })
  })

  // Get specific document
  .use(authMiddleware)
  .get('/:id', async ({ params, user, set }) => {
    try {
      const document = await Document.findById(params.id)
        .populate('owner', 'name email avatar')
        .populate('collaborators', 'name email avatar');

      if (!document) {
        set.status = 404;
        return { error: 'Document not found' };
      }

      // Check permissions
      const isOwner = user && document.owner._id.toString() === user._id.toString();
      const isCollaborator = user && document.collaborators.some(
        (c: any) => c._id.toString() === user._id.toString()
      );
      const canAccess = document.isPublic || isOwner || isCollaborator;

      if (!canAccess) {
        set.status = 403;
        return { error: 'Access denied' };
      }

      return { document };
    } catch (error) {
      console.error('Error fetching document:', error);
      set.status = 500;
      return { error: 'Failed to fetch document' };
    }
  })

  // Update document (requires ownership)
  .use(requireAuth)
  .patch('/:id', async ({ params, user, body, set }) => {
    try {
      const document = await Document.findById(params.id);

      if (!document) {
        set.status = 404;
        return { error: 'Document not found' };
      }

      // Check ownership
      if (document.owner.toString() !== user._id.toString()) {
        set.status = 403;
        return { error: 'Only the owner can update document settings' };
      }

      // Update document
      const updatedDocument = await Document.findByIdAndUpdate(
        params.id,
        { ...body, updatedAt: new Date() },
        { new: true }
      ).populate('owner', 'name email avatar')
       .populate('collaborators', 'name email avatar');

      return { document: updatedDocument };
    } catch (error) {
      console.error('Error updating document:', error);
      set.status = 500;
      return { error: 'Failed to update document' };
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      language: t.Optional(t.String()),
      isPublic: t.Optional(t.Boolean())
    })
  })

  // Add collaborator
  .post('/:id/collaborators', async ({ params, user, body, set }) => {
    try {
      const document = await Document.findById(params.id);

      if (!document) {
        set.status = 404;
        return { error: 'Document not found' };
      }

      // Check ownership
      if (document.owner.toString() !== user._id.toString()) {
        set.status = 403;
        return { error: 'Only the owner can add collaborators' };
      }

      // Check if user is already a collaborator
      const collaboratorId = new Types.ObjectId(body.userId);
      if (document.collaborators.includes(collaboratorId)) {
        set.status = 400;
        return { error: 'User is already a collaborator' };
      }

      // Add collaborator
      document.collaborators.push(collaboratorId);
      await document.save();

      const updatedDocument = await Document.findById(params.id)
        .populate('owner', 'name email avatar')
        .populate('collaborators', 'name email avatar');

      return { document: updatedDocument };
    } catch (error) {
      console.error('Error adding collaborator:', error);
      set.status = 500;
      return { error: 'Failed to add collaborator' };
    }
  }, {
    body: t.Object({
      userId: t.String()
    })
  })

  // Remove collaborator
  .delete('/:id/collaborators/:userId', async ({ params, user, set }) => {
    try {
      const document = await Document.findById(params.id);

      if (!document) {
        set.status = 404;
        return { error: 'Document not found' };
      }

      // Check ownership
      if (document.owner.toString() !== user._id.toString()) {
        set.status = 403;
        return { error: 'Only the owner can remove collaborators' };
      }

      // Remove collaborator
      document.collaborators = document.collaborators.filter(
        (c) => c.toString() !== params.userId
      );
      await document.save();

      const updatedDocument = await Document.findById(params.id)
        .populate('owner', 'name email avatar')
        .populate('collaborators', 'name email avatar');

      return { document: updatedDocument };
    } catch (error) {
      console.error('Error removing collaborator:', error);
      set.status = 500;
      return { error: 'Failed to remove collaborator' };
    }
  })

  // Delete document
  .delete('/:id', async ({ params, user, set }) => {
    try {
      const document = await Document.findById(params.id);

      if (!document) {
        set.status = 404;
        return { error: 'Document not found' };
      }

      // Check ownership
      if (document.owner.toString() !== user._id.toString()) {
        set.status = 403;
        return { error: 'Only the owner can delete the document' };
      }

      await Document.findByIdAndDelete(params.id);

      // Clean up Y.js document from memory
      yjsService.removeDocument(params.id);

      return { message: 'Document deleted successfully' };
    } catch (error) {
      console.error('Error deleting document:', error);
      set.status = 500;
      return { error: 'Failed to delete document' };
    }
  });