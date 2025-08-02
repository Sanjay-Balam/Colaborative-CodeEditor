'use client';

import { useState, useEffect } from 'react';

interface Invitation {
  id: string;
  document: {
    title: string;
    language: string;
  };
  sender: {
    name: string;
    email: string;
  };
  createdAt: string;
  inviteToken: string;
}

export default function NotificationBell() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call your API with authentication
      const response = await fetch('/api/invitations/pending', {
        headers: {
          // Add authorization header here
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch invitations on component mount
    fetchInvitations();
    
    // Poll for new invitations every 30 seconds
    const interval = setInterval(fetchInvitations, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAcceptInvitation = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/invitations/accept/${inviteToken}`, {
        method: 'POST',
        headers: {
          // Add authorization header here
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Remove from local state
        setInvitations(prev => prev.filter(inv => inv.inviteToken !== inviteToken));
        // Redirect to document
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDeclineInvitation = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/invitations/decline/${inviteToken}`, {
        method: 'POST'
      });

      if (response.ok) {
        // Remove from local state
        setInvitations(prev => prev.filter(inv => inv.inviteToken !== inviteToken));
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM20.485 2.515l-9.192 9.192a8.5 8.5 0 0111.414 11.414l9.192-9.192a2.5 2.5 0 00-3.536-3.536z" />
        </svg>
        
        {invitations.length > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {invitations.length > 9 ? '9+' : invitations.length}
          </div>
        )}
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Collaboration Invitations ({invitations.length})
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No pending invitations
              </div>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invitation.document.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Invited by {invitation.sender.name}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptInvitation(invitation.inviteToken)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(invitation.inviteToken)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs px-3 py-1.5 rounded transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {invitations.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setInvitations([])}
                className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}