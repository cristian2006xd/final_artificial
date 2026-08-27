import { Component, ElementRef, NgZone, ViewChild, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ChatHistoryService, ChatMessage, Conversation } from '../core/chat-history.service';
import { ClassifierService } from '../core/classifier.service';
import { CatalogService } from '../core/catalog.service';

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

  private readonly greetings = ['hola', 'buenas', 'hey', 'holi', 'que tal', 'buenos dias', 'buenas tardes', 'buenas noches'];
  private readonly thanks = ['gracias', 'thank', 'genial', 'perfecto'];
  private readonly farewells = ['adios', 'chao', 'nos vemos', 'bye', 'hasta luego'];
  private readonly help = ['ayuda', 'help', 'que puedes hacer', 'que haces'];

  private readonly genericReplies = [
    'Interesante, cuéntame más sobre eso.',
    'Entiendo, ¿en qué más puedo ayudarte?',
    'Todavía estoy aprendiendo, pero anoté eso.',
    'Vale, ¿algo más que quieras contarme?',
    'Recibido. Por ahora solo tengo respuestas básicas, pronto seré más inteligente 🙂',
    '¡Buena pregunta! Cuando conecte una API real te podré responder mejor.',
  ];

  constructor(
    private zone: NgZone,
    private history: ChatHistoryService,
    private auth: AuthService,
    private classifier: ClassifierService,
    private catalog: CatalogService
  ) {
    this.setupSpeechRecognition();

    // Carga inicial y recarga del historial cada vez que cambia la sesión
    // (login / logout), para no mezclar el historial de invitado con el de una cuenta.
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

  // ---------- Conversations / history ----------

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
    if (hour < 12) {
      return 'Buenos días';
    }
    if (hour < 19) {
      return 'Buenas tardes';
    }
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

  // ---------- Sending messages ----------

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text && !this.selectedImage) {
      return;
    }
    const conversation = this.currentConversation;
    if (!conversation) {
      return;
    }

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
    this.inputText = '';
    this.selectedImage = null;
    this.selectedImageFile = null;
    this.shouldScroll = true;

    if (imageFile) {
      this.classifyImage(conversation.id, imageFile);
    } else {
      this.simulateBotResponse(conversation.id, text);
    }
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ---------- Images ----------

  triggerFileSelect(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
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

  // ---------- Empty-state suggestions ----------

  focusInput(): void {
    this.textInput?.nativeElement.focus();
  }

  useSamplePrompt(text: string): void {
    this.inputText = text;
    this.focusInput();
  }

  // ---------- Speech to text ----------

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

    // SpeechRecognition callbacks fire outside Angular's zone (zone.js does not
    // patch this API), so updates here must be run through NgZone or the view
    // never refreshes and the input/mic button appear frozen.
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
    if (!this.micSupported) {
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.inputText = '';
      this.recognition.start();
      this.isListening = true;
    }
  }

  // ---------- Image classification (backend Flask + modelo Keras) ----------

  private async classifyImage(conversationId: string, file: File): Promise<void> {
    this.isTyping = true;
    this.shouldScroll = true;

    try {
      const result = await this.classifier.classify(file);
      this.isTyping = false;
      this.pushBotMessage(conversationId, this.buildClassificationReply(result.clase, result.confianza));
    } catch {
      this.isTyping = false;
      this.pushBotMessage(
        conversationId,
        'No pude analizar la imagen: el servicio de clasificación no está disponible en este momento. Verifica que el backend esté corriendo.'
      );
    }
    this.shouldScroll = true;
  }

  private buildClassificationReply(clase: string, confianza: string): string {
    const match = this.catalog.products().find(p => p.category === clase);
    if (match) {
      return `Creo que esto es "${clase}" (confianza: ${confianza}). ${match.icon} Tenemos "${match.name}" en el catálogo por $${match.price.toFixed(2)}.`;
    }
    return `Creo que esto es "${clase}" (confianza: ${confianza}), pero no encontré ese producto en el catálogo.`;
  }

  // ---------- Bot logic (basic, offline, no API yet) ----------

  private simulateBotResponse(conversationId: string, userText: string): void {
    this.isTyping = true;
    this.shouldScroll = true;

    const delay = 700 + Math.random() * 900;
    setTimeout(() => {
      this.isTyping = false;
      const reply = this.getBotReply(userText);
      this.pushBotMessage(conversationId, reply);
      this.shouldScroll = true;
    }, delay);
  }

  private getBotReply(userText: string): string {
    const normalized = userText.toLowerCase();

    if (!normalized) {
      return '¿Puedes escribir algo más? No recibí ningún texto.';
    }
    if (this.matchesAny(normalized, this.greetings)) {
      return '¡Hola! ¿En qué puedo ayudarte hoy?';
    }
    if (this.matchesAny(normalized, this.thanks)) {
      return '¡De nada! Estoy para ayudarte 😊';
    }
    if (this.matchesAny(normalized, this.farewells)) {
      return '¡Hasta luego! Vuelve cuando quieras.';
    }
    if (this.matchesAny(normalized, this.help)) {
      return 'Por ahora puedo chatear contigo, recibir imágenes y escuchar tu voz con el micrófono. Mis respuestas son básicas hasta que conecte una API real.';
    }
    if (normalized.includes('?')) {
      return 'Buena pregunta. Todavía no tengo una API conectada, así que mis respuestas son limitadas por ahora.';
    }

    return this.genericReplies[Math.floor(Math.random() * this.genericReplies.length)];
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private pushBotMessage(conversationId: string, text: string): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      return;
    }
    const message: ChatMessage = {
      id: this.genId(),
      sender: 'bot',
      text,
      time: new Date()
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    this.history.appendMessage(conversationId, message);
  }

  // ---------- Utils ----------

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
