import { Component, ElementRef, NgZone, ViewChild, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../core/auth.service';
import { ChatHistoryService, ChatMessage, Conversation } from '../core/chat-history.service';
import { ClassifierService } from '../core/classifier.service';
import { CatalogService } from '../core/catalog.service';

const supabase = createClient('https://tyarvtlkstmgadvnqleu.supabase.co', 'sb_publishable_MARFHGPg60bechP8jzFy8w_td_tkxHQ');

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('textInput') private textInput!: ElementRef<HTMLInputElement>;

  conversations: Conversation[] = [];
  currentConversationId = '';

  inputText = '';
  selectedImage: string | null = null;
  selectedImageFile: File | null = null;
  isTyping = false;
  isListening = false;
  micSupported = true;
  isSidebarOpen = false;
  historyLoading = true;

  private recognition: any;
  private shouldScroll = false;
  private lastUserId: string | null = null;

  constructor(
    private zone: NgZone,
    private history: ChatHistoryService,
    private auth: AuthService,
    private classifier: ClassifierService,
    private catalog: CatalogService,
    private http: HttpClient
  ) {
    this.setupSpeechRecognition();

    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      if (userId !== this.lastUserId) {
        this.lastUserId = userId;
        this.reloadConversations();
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  get currentConversation(): Conversation | undefined {
    return this.conversations.find(c => c.id === this.currentConversationId);
  }

  get messages(): ChatMessage[] {
    return this.currentConversation?.messages ?? [];
  }

  get sortedConversations(): Conversation[] {
    return [...this.conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  private async reloadConversations(): Promise<void> {
    this.historyLoading = true;
    this.conversations = await this.history.load();

    if (this.conversations.length === 0) {
      await this.createConversation();
    } else {
      this.currentConversationId = this.sortedConversations[0].id;
    }
    this.historyLoading = false;
    this.shouldScroll = true;
  }

  async createConversation(): Promise<void> {
    const conversation = await this.history.createConversation();
    this.conversations.unshift(conversation);
    this.currentConversationId = conversation.id;
    this.isSidebarOpen = false;
    this.inputText = '';
    this.selectedImage = null;
    this.selectedImageFile = null;
    this.shouldScroll = true;
  }

  selectConversation(id: string): void {
    if (id === this.currentConversationId) {
      this.isSidebarOpen = false;
      return;
    }
    this.currentConversationId = id;
    this.isSidebarOpen = false;
    this.inputText = '';
    this.selectedImage = null;
    this.selectedImageFile = null;
    this.shouldScroll = true;
  }

  async deleteConversation(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    this.conversations = this.conversations.filter(c => c.id !== id);
    await this.history.deleteConversation(id);

    if (this.conversations.length === 0) {
      await this.createConversation();
      return;
    }

    if (id === this.currentConversationId) {
      this.currentConversationId = this.sortedConversations[0].id;
    }
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text && !this.selectedImage) {
      return;
    }
    const conversation = this.currentConversation;
    if (!conversation) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const emailUsuario = user?.email || 'Anónimo';

    const historialPayload = conversation.messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text || (m.image ? '[Imagen enviada]' : '')
    }));

    const userMessage: ChatMessage = {
      id: this.genId(),
      sender: 'user',
      text: text || undefined,
      image: this.selectedImage || undefined,
      time: new Date()
    };
    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date();
    this.history.appendMessage(conversation.id, userMessage);

    if (conversation.title === 'Nueva conversación' && text) {
      conversation.title = text.length > 32 ? text.slice(0, 32) + '…' : text;
      this.history.renameConversation(conversation.id, conversation.title);
    } else if (conversation.title === 'Nueva conversación' && this.selectedImage) {
      conversation.title = '📷 Imagen';
      this.history.renameConversation(conversation.id, conversation.title);
    }

    const imageFile = this.selectedImageFile;
    const currentText = text;

    this.inputText = '';
    this.selectedImage = null;
    this.selectedImageFile = null;
    this.shouldScroll = true;
    this.isTyping = true;

    const formData = new FormData();
    formData.append('text', currentText);
    formData.append('historial', JSON.stringify(historialPayload));
    formData.append('usuario_email', emailUsuario);
    
    if (imageFile) {
      formData.append('file', imageFile);
    }

    this.http.post<any>('http://127.0.0.1:5000/predict', formData).subscribe({
      next: (response) => {
        this.isTyping = false;
        const respuestaBot = response.respuesta_agente || 'Respuesta vacía del servidor.';
        const audioUrl = response.audio_url || null;

        this.pushBotMessage(conversation.id, respuestaBot, audioUrl);

        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play().catch(e => console.log("Audio play blocked by browser:", e));
        }

        this.shouldScroll = true;
      },
      error: (err) => {
        this.isTyping = false;
        this.pushBotMessage(
          conversation.id,
          'Error al conectar con el servidor de Flask. Verifica que esté ejecutándose en http://127.0.0.1:5000'
        );
        this.shouldScroll = true;
        console.error(err);
      }
    });
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  triggerFileSelect(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeSelectedImage(): void {
    this.selectedImage = null;
    this.selectedImageFile = null;
  }

  focusInput(): void {
    this.textInput?.nativeElement.focus();
  }

  useSamplePrompt(text: string): void {
    this.inputText = text;
    this.focusInput();
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.micSupported = false;
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = 'es-ES';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.zone.run(() => {
        this.inputText = transcript;
      });
    };

    this.recognition.onerror = () => {
      this.zone.run(() => {
        this.isListening = false;
      });
    };

    this.recognition.onend = () => {
      this.zone.run(() => {
        this.isListening = false;
      });
    };
  }

  toggleMic(): void {
    if (!this.micSupported) return;
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.inputText = '';
      this.recognition.start();
      this.isListening = true;
    }
  }

  private pushBotMessage(conversationId: string, text: string, audioUrl?: string): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    const message: ChatMessage & { audioUrl?: string } = {
      id: this.genId(),
      sender: 'bot',
      text,
      audioUrl,
      time: new Date()
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    this.history.appendMessage(conversationId, message);
  }

  private genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {
      // ignore
    }
  }

  trackByMessageId(_index: number, message: ChatMessage): string {
    return message.id;
  }

  trackByConvId(_index: number, conversation: Conversation): string {
    return conversation.id;
  }
}