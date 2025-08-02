import { Invitation, IInvitation } from '../models/Invitation';
import { Document } from '../models/Document';
import { User } from '../models/User';
import { Types } from 'mongoose';
import crypto from 'crypto';

export class InvitationService {
  
  async createInvitation(documentId: string, senderId: string, recipientEmail: string): Promise<IInvitation> {
    // Check if document exists and sender has permission
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const isOwner = document.owner.toString() === senderId;
    const isCollaborator = document.collaborators.some(c => c.toString() === senderId);
    
    if (!isOwner && !isCollaborator) {
      throw new Error('You do not have permission to invite users to this document');
    }

    // Check if invitation already exists and is pending
    const existingInvitation = await Invitation.findOne({
      documentId: new Types.ObjectId(documentId),
      recipientEmail,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email');
    }

    // Check if user is already a collaborator
    const recipientUser = await User.findOne({ email: recipientEmail });
    if (recipientUser) {
      const isAlreadyCollaborator = document.collaborators.some(
        c => c.toString() === recipientUser._id.toString()
      );
      if (isAlreadyCollaborator || document.owner.toString() === recipientUser._id.toString()) {
        throw new Error('User is already a collaborator on this document');
      }
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = new Invitation({
      documentId: new Types.ObjectId(documentId),
      senderId: new Types.ObjectId(senderId),
      recipientEmail,
      recipientId: recipientUser?._id || null,
      inviteToken,
      status: 'pending'
    });

    await invitation.save();
    
    // Populate sender and document info
    await invitation.populate('senderId', 'name email');
    await invitation.populate('documentId', 'title language');

    return invitation;
  }

  async acceptInvitation(inviteToken: string, userId?: string): Promise<IInvitation> {
    const invitation = await Invitation.findOne({
      inviteToken,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('documentId');

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    let recipientId = invitation.recipientId;

    // If user is provided, verify they match the invitation
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.email !== invitation.recipientEmail) {
        throw new Error('This invitation is not for your email address');
      }

      recipientId = user._id;
    } else {
      // If no userId provided, find user by email
      const user = await User.findOne({ email: invitation.recipientEmail });
      if (user) {
        recipientId = user._id;
      } else {
        throw new Error('User must be registered to accept invitation');
      }
    }

    // Add user as collaborator to the document
    await Document.findByIdAndUpdate(
      invitation.documentId._id,
      { $addToSet: { collaborators: recipientId } }
    );

    // Update invitation status
    invitation.status = 'accepted';
    invitation.recipientId = recipientId;
    await invitation.save();

    return invitation;
  }

  async declineInvitation(inviteToken: string): Promise<IInvitation> {
    const invitation = await Invitation.findOne({
      inviteToken,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    invitation.status = 'declined';
    await invitation.save();

    return invitation;
  }

  async getUserInvitations(userId: string): Promise<IInvitation[]> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return await Invitation.find({
      recipientEmail: user.email,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
    .populate('senderId', 'name email')
    .populate('documentId', 'title language')
    .sort({ createdAt: -1 });
  }

  async getDocumentInvitations(documentId: string, userId: string): Promise<IInvitation[]> {
    // Verify user has access to this document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(c => c.toString() === userId);
    
    if (!isOwner && !isCollaborator) {
      throw new Error('You do not have permission to view invitations for this document');
    }

    return await Invitation.find({
      documentId: new Types.ObjectId(documentId)
    })
    .populate('senderId', 'name email')
    .populate('recipientId', 'name email')
    .sort({ createdAt: -1 });
  }

  async revokeInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await Invitation.findById(invitationId).populate('documentId');
    
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    const document = invitation.documentId as any;
    
    // Only owner or sender can revoke
    const canRevoke = document.owner.toString() === userId || 
                     invitation.senderId.toString() === userId;
    
    if (!canRevoke) {
      throw new Error('You do not have permission to revoke this invitation');
    }

    invitation.status = 'expired';
    await invitation.save();
  }

  generateInviteLink(inviteToken: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/invite/${inviteToken}`;
  }
}