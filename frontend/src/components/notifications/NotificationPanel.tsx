'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, MessageCircle, User, FileText, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPanelProps {
  userId: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function NotificationPanel({ userId, isVisible, onToggle }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading
  } = useNotifications(userId);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'comment':
        return <MessageCircle size={16} className="text-green-500" />;
      case 'invitation':
        return <User size={16} className="text-purple-500" />;
      case 'document_update':
        return <FileText size={16} className="text-orange-500" />;
      case 'user_joined':
        return <User size={16} className="text-teal-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-20 bg-white border border-gray-200 hover:border-gray-300 p-2 rounded-lg shadow-sm transition-colors relative"
        title="Notifications"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col z-30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Bell size={20} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              title="Mark all as read"
            >
              <Check size={16} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <Bell size={48} className="mb-4 opacity-50" />
            <p className="text-center">No notifications yet</p>
            <p className="text-sm text-center mt-1">
              You'll see mentions, comments, and updates here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead(notification.id);
                  }
                  // Handle navigation to related content
                  if (notification.documentId) {
                    window.location.href = `/editor/${notification.documentId._id}`;
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {notification.documentId && (
                          <p className="text-xs text-gray-500 mt-2">
                            in {notification.documentId.title}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTime(notification.createdAt)}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete notification"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => {
              // Navigate to notifications page or load more
              console.log('View all notifications');
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
}