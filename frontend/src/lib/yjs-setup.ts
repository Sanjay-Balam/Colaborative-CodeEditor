import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { editor } from 'monaco-editor';

export class CollaborationManager {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private wsProvider: WebsocketProvider | null = null;
  private monacoBinding: MonacoBinding | null = null;

  constructor(private documentId: string, private userId: string) {
    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText('monaco');
  }

  connect(monacoEditor: editor.IStandaloneCodeEditor, wsUrl: string) {
    this.wsProvider = new WebsocketProvider(
      wsUrl,
      this.documentId,
      this.ydoc
    );

    this.monacoBinding = new MonacoBinding(
      this.ytext,
      monacoEditor.getModel()!,
      new Set([monacoEditor]),
      this.wsProvider.awareness
    );

    this.wsProvider.awareness.setLocalStateField('user', {
      id: this.userId,
      color: this.generateUserColor(this.userId),
      name: 'User' // Will be replaced with actual user name
    });

    return {
      provider: this.wsProvider,
      binding: this.monacoBinding,
      awareness: this.wsProvider.awareness
    };
  }

  disconnect() {
    if (this.monacoBinding) {
      this.monacoBinding.destroy();
      this.monacoBinding = null;
    }
    
    if (this.wsProvider) {
      this.wsProvider.destroy();
      this.wsProvider = null;
    }
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  getDocument() {
    return this.ydoc;
  }

  getText() {
    return this.ytext;
  }
}