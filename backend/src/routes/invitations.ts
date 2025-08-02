import { Elysia, t } from 'elysia';
import { InvitationService } from '../services/InvitationService';
import { requireAuth, authMiddleware } from '../middleware/auth';

const invitationService = new InvitationService();

export const invitationRoutes = new Elysia({ prefix: '/api/invitations' })

  // Send invitation to collaborate on a document
  .use(requireAuth)
  .post('/send', async ({ user, body, set }) => {
    try {
      const { documentId, recipientEmail } = body;

      const invitation = await invitationService.createInvitation(
        documentId,
        user._id.toString(),
        recipientEmail
      );

      const inviteLink = invitationService.generateInviteLink(invitation.inviteToken);

      return {
        invitation: {
          id: invitation._id,
          documentId: invitation.documentId,
          recipientEmail: invitation.recipientEmail,
          status: invitation.status,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt
        },
        inviteLink
      };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      set.status = 400;
      return { error: error.message || 'Failed to send invitation' };
    }
  }, {
    body: t.Object({
      documentId: t.String(),
      recipientEmail: t.String()
    })
  })

  // Get user's pending invitations
  .get('/pending', async ({ user }) => {
    try {
      const invitations = await invitationService.getUserInvitations(user._id.toString());
      
      return {
        invitations: invitations.map(inv => ({
          id: inv._id,
          document: inv.documentId,
          sender: inv.senderId,
          status: inv.status,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          inviteToken: inv.inviteToken
        }))
      };
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      return { error: error.message || 'Failed to fetch invitations' };
    }
  })

  // Get invitations for a specific document
  .get('/document/:documentId', async ({ params, user, set }) => {
    try {
      const invitations = await invitationService.getDocumentInvitations(
        params.documentId,
        user._id.toString()
      );

      return {
        invitations: invitations.map(inv => ({
          id: inv._id,
          recipientEmail: inv.recipientEmail,
          recipient: inv.recipientId,
          sender: inv.senderId,
          status: inv.status,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt
        }))
      };
    } catch (error: any) {
      console.error('Error fetching document invitations:', error);
      set.status = 400;
      return { error: error.message || 'Failed to fetch document invitations' };
    }
  })

  // Accept invitation
  .use(authMiddleware)
  .post('/accept/:token', async ({ params, user, set }) => {
    try {
      const invitation = await invitationService.acceptInvitation(
        params.token,
        user?._id.toString()
      );

      return {
        message: 'Invitation accepted successfully',
        document: invitation.documentId,
        redirectUrl: `/editor/${invitation.documentId._id}`
      };
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      set.status = 400;
      return { error: error.message || 'Failed to accept invitation' };
    }
  })

  // Decline invitation
  .post('/decline/:token', async ({ params, set }) => {
    try {
      await invitationService.declineInvitation(params.token);
      
      return { message: 'Invitation declined successfully' };
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      set.status = 400;
      return { error: error.message || 'Failed to decline invitation' };
    }
  })

  // Get invitation details by token (for invite page)
  .get('/details/:token', async ({ params, set }) => {
    try {
      const { Invitation } = await import('../models/Invitation');
      const invitation = await Invitation
        .findOne({ inviteToken: params.token })
        .populate('senderId', 'name email')
        .populate('documentId', 'title language');

      if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
        set.status = 404;
        return { error: 'Invalid or expired invitation' };
      }

      return {
        invitation: {
          id: invitation._id,
          document: invitation.documentId,
          sender: invitation.senderId,
          recipientEmail: invitation.recipientEmail,
          expiresAt: invitation.expiresAt
        }
      };
    } catch (error: any) {
      console.error('Error fetching invitation details:', error);
      set.status = 400;
      return { error: error.message || 'Failed to fetch invitation details' };
    }
  })

  // Revoke invitation (owner/sender only)
  .use(requireAuth)
  .delete('/:invitationId', async ({ params, user, set }) => {
    try {
      await invitationService.revokeInvitation(
        params.invitationId,
        user._id.toString()
      );

      return { message: 'Invitation revoked successfully' };
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      set.status = 400;
      return { error: error.message || 'Failed to revoke invitation' };
    }
  });