import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  image?: string;
  time: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: Date;
}

const LOCAL_STORAGE_KEY = 'chatbot_conversations';

@Injectable({ providedIn: 'root' })
export class ChatHistoryService {
  constructor(private auth: AuthService, private supabase: SupabaseService) {}

  async load(): Promise<Conversation[]> {
    const user = this.auth.currentUser();
    return user ? this.loadFromSupabase(user.id) : this.readLocal();
  }

  async createConversation(): Promise<Conversation> {
    const user = this.auth.currentUser();

    if (user) {
      const { data, error } = await this.supabase.client
        .from('conversations')
        .insert({ user_id: user.id, title: 'Nueva conversación' })
        .select()
        .single();

      if (!error && data) {
        return { id: data['id'], title: data['title'], messages: [], updatedAt: new Date(data['updated_at']) };
      }
    }

    const conversation = this.newLocalConversation();
    const all = this.readLocal();
    all.unshift(conversation);
    this.writeLocal(all);
    return conversation;
  }

  async renameConversation(id: string, title: string): Promise<void> {
    const user = this.auth.currentUser();

    if (user) {
      await this.supabase.client
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id);
      return;
    }

    const all = this.readLocal();
    const conversation = all.find(c => c.id === id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      this.writeLocal(all);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    const user = this.auth.currentUser();

    if (user) {
      await this.supabase.client.from('conversations').delete().eq('id', id);
      return;
    }

    this.writeLocal(this.readLocal().filter(c => c.id !== id));
  }

  async appendMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const user = this.auth.currentUser();

    if (user) {
      await this.supabase.client.from('messages').insert({
        conversation_id: conversationId,
        sender: message.sender,
        text: message.text ?? null,
        image_url: message.image ?? null
      });
      await this.supabase.client
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      return;
    }

    const all = this.readLocal();
    const conversation = all.find(c => c.id === conversationId);
    if (conversation) {
      conversation.messages.push(message);
      conversation.updatedAt = new Date();
      this.writeLocal(all);
    }
  }

  private async loadFromSupabase(userId: string): Promise<Conversation[]> {
    const { data: convRows } = await this.supabase.client
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!convRows || convRows.length === 0) {
      return [];
    }

    const { data: messageRows } = await this.supabase.client
      .from('messages')
      .select('id, conversation_id, sender, text, image_url, created_at')
      .in(
        'conversation_id',
        convRows.map(c => c['id'])
      )
      .order('created_at', { ascending: true });

    return convRows.map(c => ({
      id: c['id'],
      title: c['title'],
      updatedAt: new Date(c['updated_at']),
      messages: (messageRows ?? [])
        .filter(m => m['conversation_id'] === c['id'])
        .map(m => ({
          id: m['id'],
          sender: m['sender'],
          text: m['text'] ?? undefined,
          image: m['image_url'] ?? undefined,
          time: new Date(m['created_at'])
        }))
    }));
  }

  private newLocalConversation(): Conversation {
    return { id: this.genId(), title: 'Nueva conversación', messages: [], updatedAt: new Date() };
  }

  private genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private readLocal(): Conversation[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: Conversation[] = JSON.parse(raw);
      return parsed.map(c => ({
        ...c,
        updatedAt: new Date(c.updatedAt),
        messages: c.messages.map(m => ({ ...m, time: new Date(m.time) }))
      }));
    } catch {
      return [];
    }
  }

  private writeLocal(conversations: Conversation[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // storage unavailable, ignore
    }
  }
}
