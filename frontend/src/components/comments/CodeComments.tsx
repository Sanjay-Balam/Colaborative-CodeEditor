'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Plus, Check, Reply, X } from 'lucide-react';
import { useCodeComments } from '@/hooks/useCodeComments';

interface CodeCommentsProps {
  documentId: string;
  userId: string;
  userName: string;
  editorRef: React.RefObject<any>;
  selectedLine?: number;
  onLineSelect?: (line: number | null) => void;
}

export default function CodeComments({
  documentId,
  userId,
  userName,
  editorRef,
  selectedLine,
  onLineSelect
}: CodeCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const {
    comments,
    addComment,
    addReply,
    resolveComment,
    isConnected
  } = useCodeComments(documentId, userId);

  const handleAddComment = async () => {
    if (!newComment.trim() || selectedLine === undefined) return;
    
    await addComment(selectedLine, newComment);
    setNewComment('');
    onLineSelect?.(null);
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    
    await addReply(commentId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Add comment indicators to editor
  useEffect(() => {
    if (!editorRef.current || comments.length === 0) return;

    const editor = editorRef.current;
    const decorations: any[] = [];

    comments.forEach(comment => {
      if (!comment.isResolved) {
        decorations.push({
          range: {
            startLineNumber: comment.lineNumber + 1,
            startColumn: 1,
            endLineNumber: comment.lineNumber + 1,
            endColumn: 1
          },
          options: {
            isWholeLine: false,
            glyphMarginClassName: 'comment-glyph-margin',
            glyphMarginHoverMessage: {
              value: `**${comment.user.name}**: ${comment.comment}`
            },
            stickiness: 1
          }
        });
      }
    });

    const decorationIds = editor.deltaDecorations([], decorations);

    // Add CSS for comment indicators
    const style = document.createElement('style');
    style.textContent = `
      .comment-glyph-margin {
        background: #3b82f6 !important;
        width: 4px !important;
        margin-left: 2px;
        border-radius: 2px;
      }
      .comment-glyph-margin:hover {
        background: #1d4ed8 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      editor.deltaDecorations(decorationIds, []);
      document.head.removeChild(style);
    };
  }, [comments, editorRef]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageCircle size={18} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">Comments</h3>
          <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-1">
            {comments.filter(c => !c.isResolved).length}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* New Comment Form */}
      {selectedLine !== undefined && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="text-sm text-blue-700 mb-2">
            Adding comment to line {selectedLine + 1}
          </div>
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} className="inline mr-1" />
                Add Comment
              </button>
              <button
                onClick={() => {
                  setNewComment('');
                  onLineSelect?.(null);
                }}
                className="px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="max-h-96 overflow-y-auto">
        {comments.filter(c => !c.isResolved).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm mt-1">Click on a line number to add a comment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments
              .filter(comment => !comment.isResolved)
              .map((comment) => (
                <div key={comment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm text-gray-900">
                        {comment.user.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Line {comment.lineNumber + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className="text-green-600 hover:text-green-800 text-xs"
                        title="Resolve comment"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          // Jump to line in editor
                          if (editorRef.current) {
                            editorRef.current.setPosition({
                              lineNumber: comment.lineNumber + 1,
                              column: 1
                            });
                            editorRef.current.focus();
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        title="Jump to line"
                      >
                        #{comment.lineNumber + 1}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-800 mb-3 ml-8">
                    {comment.comment}
                  </p>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 space-y-2 border-l-2 border-gray-200 pl-4">
                      {comment.replies.map((reply, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-xs text-gray-700">
                              {reply.userId.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{reply.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingTo === comment.id ? (
                    <div className="ml-8 mt-3 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add a reply..."
                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyText.trim()}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          className="px-2 py-1 text-gray-600 text-xs rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="ml-8 mt-2 text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                    >
                      <Reply size={12} />
                      <span>Reply</span>
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}