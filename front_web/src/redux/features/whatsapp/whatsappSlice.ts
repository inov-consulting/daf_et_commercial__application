import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { GetData, PostData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

// ── API Types ──────────────────────────────────────────────────────────────────

export interface WaConversation {
  id: string;
  wa_id: string;
  contact_name: string;
  display_phone_number: string;
  status: string;
  last_message_at: string;
  created_at: string;
  message_count: number;
  unread_count?: number;
  // Champs enrichis localement pour le preview
  last_message_body?:            string;
  last_message_direction?:       string;
  last_message_delivery_status?: string;
  last_message_type?:            string;
}

export interface WaMessage {
  id: string;
  wamid: string;
  direction: string;        // "inbound" | "outbound"
  message_type: string;     // "text" | "image" | "audio" | "document" | "video" | "reaction"
  body: string | null;
  media_id: string | null;
  media_url: string | null;
  media_filename: string | null;
  delivery_status: string | null;
  error_message: string | null;
  meta_timestamp: string;
  created_at: string;
  // Champs réaction (mappés par le backend si disponibles)
  reaction_emoji?:          string | null;
  reaction_message_wamid?:  string | null;
}

// ── State ──────────────────────────────────────────────────────────────────────

interface WhatsAppState {
  conversations:   WaConversation[];
  loading:         boolean;
  error:           string | null;

  activeConvId:    string | null;

  messages:        Record<string, WaMessage[]>;
  loadingMessages: boolean;
  messagesError:   string | null;

  starting:        boolean;
  startError:      string | null;

  sending:         boolean;
  sendError:       string | null;

  generatingCr:    boolean;
  crError:         string | null;
  lastCrId:        string | null;

  linkingCr:       boolean;
  linkCrError:     string | null;

  transcriptions:  Record<string, string>;   // messageId → transcribed text
  transcribing:    Record<string, boolean>;  // messageId → loading
}

const initialState: WhatsAppState = {
  conversations:   [],
  loading:         false,
  error:           null,
  activeConvId:    null,
  messages:        {},
  loadingMessages: false,
  messagesError:   null,
  starting:        false,
  startError:      null,
  sending:         false,
  sendError:       null,
  generatingCr:    false,
  crError:         null,
  lastCrId:        null,
  linkingCr:       false,
  linkCrError:     null,
  transcriptions:  {},
  transcribing:    {},
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const fetchConversations = createAsyncThunk(
  'whatsapp/fetchConversations',
  async (
    params: { status?: string; limit?: number; offset?: number } | void,
    { rejectWithValue },
  ) => {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.status  !== undefined) qs.append('status', p.status);
    if (p.limit   !== undefined) qs.append('limit',  String(p.limit));
    if (p.offset  !== undefined) qs.append('offset', String(p.offset));
    const query = qs.toString();
    const url = `${ApiRoutes.WHATSAPP_CONVERSATIONS}${query ? `?${query}` : ''}`;
    const res = await GetData<WaConversation[]>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les conversations');
    return res.data!;
  },
);

export const fetchMessages = createAsyncThunk(
  'whatsapp/fetchMessages',
  async (
    { conversationId, limit = 100, offset = 0 }: {
      conversationId: string;
      limit?: number;
      offset?: number;
    },
    { rejectWithValue },
  ) => {
    const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const url = `${ApiRoutes.WHATSAPP_MESSAGES(conversationId)}?${qs}`;
    const res = await GetData<WaMessage[]>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les messages');
    return { conversationId, messages: res.data! };
  },
);

export const startConversation = createAsyncThunk(
  'whatsapp/start',
  async (
    { phone, text, contactName, file }: {
      phone:        string;
      text?:        string;
      contactName?: string;
      file?:        File;
    },
    { rejectWithValue },
  ) => {
    const payload: Record<string, unknown> = { phone };
    if (text)        payload.text         = text;
    if (contactName) payload.contact_name = contactName;
    if (file)        payload.file         = file;

    const res = await PostData<WaConversation>({
      url: ApiRoutes.WHATSAPP_CONVERSATIONS_START,
      data: payload,
      protected: true,
      isMultipart: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de démarrer la conversation');
    return res.data!;
  },
);

export const replyToConversation = createAsyncThunk(
  'whatsapp/reply',
  async (
    { conversationId, text, file }: {
      conversationId: string;
      text?:          string;
      file?:          File;
    },
    { rejectWithValue },
  ) => {
    const payload: Record<string, unknown> = {};
    if (file) {
      payload.text = text ?? '';
      payload.file = file;
    } else if (text) {
      payload.text = text;
    }

    const res = await PostData<WaMessage>({
      url:         ApiRoutes.WHATSAPP_REPLY(conversationId),
      data:        payload,
      protected:   true,
      isMultipart: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Impossible d'envoyer le message");
    return { conversationId, message: res.data! };
  },
);

export interface GeneratedCr {
  id:     string;
  status: string;
  [key: string]: unknown;
}

export const markConversationRead = createAsyncThunk(
  'whatsapp/markRead',
  async (conversationId: string) => {
    await PostData({ url: ApiRoutes.WHATSAPP_READ(conversationId), data: {}, protected: true });
    return conversationId;
  },
);

export const generateConvCr = createAsyncThunk(
  'whatsapp/generateCr',
  async (
    { conversationId, extraNoteIds = [] }: {
      conversationId: string;
      extraNoteIds?:  string[];
    },
    { rejectWithValue },
  ) => {
    const res = await PostData<GeneratedCr>({
      url:       ApiRoutes.WHATSAPP_GENERATE_CR(conversationId),
      data:      { extra_note_ids: extraNoteIds },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de générer le compte-rendu');
    return res.data!;
  },
);

export const transcribeMessage = createAsyncThunk(
  'whatsapp/transcribeMessage',
  async (
    { messageId, mediaUrl }: { messageId: string; mediaUrl: string },
    { rejectWithValue },
  ) => {
    // Télécharger le fichier audio puis l'envoyer en multipart
    let audioFile: File;
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const ext  = mediaUrl.split('.').pop()?.split('?')[0] ?? 'ogg';
      audioFile  = new File([blob], `audio.${ext}`, { type: blob.type || 'audio/ogg' });
    } catch {
      return rejectWithValue('Impossible de récupérer le fichier audio');
    }

    const res = await PostData<{ text: string }>({
      url:         ApiRoutes.VOCAL_TRANSCRIBE,
      data:        { file: audioFile },
      protected:   true,
      isMultipart: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de transcrire le message');
    return { messageId, text: res.data!.text };
  },
);

export const linkCrToProspect = createAsyncThunk(
  'whatsapp/linkCrToProspect',
  async (
    { crId, prospectId }: { crId: string; prospectId: string },
    { rejectWithValue },
  ) => {
    const res = await PatchData<GeneratedCr>({
      url:       ApiRoutes.WHATSAPP_CR_LINK_PROSPECT(crId),
      data:      { prospect_id: prospectId },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de lier le CR à la prospection');
    return res.data!;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const whatsappSlice = createSlice({
  name: 'whatsapp',
  initialState,
  reducers: {
    setActiveConvId(state, action: PayloadAction<string | null>) {
      state.activeConvId = action.payload;
    },
    toggleConversationClosed(state, action: PayloadAction<string>) {
      const conv = state.conversations.find(c => c.id === action.payload);
      if (conv) conv.status = conv.status === 'closed' ? 'open' : 'closed';
    },
    clearWhatsAppErrors(state) {
      state.error         = null;
      state.messagesError = null;
      state.startError    = null;
      state.sendError     = null;
      state.crError       = null;
      state.linkCrError   = null;
    },
    clearCrState(state) {
      state.lastCrId  = null;
      state.crError   = null;
    },
    wsMessageReceived(state, action: PayloadAction<{ conversationId: string; message: WaMessage }>) {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      const idx = state.messages[conversationId].findIndex(
        m => m.id === message.id || (message.wamid && m.wamid === message.wamid),
      );
      // Merge avec l'existant : préserve direction/body/type si l'événement est une mise
      // à jour partielle de statut (sans ces champs)
      if (idx !== -1) {
        state.messages[conversationId][idx] = { ...state.messages[conversationId][idx], ...message };
      } else {
        state.messages[conversationId].push(message);
      }
      // Remonter la conversation + enrichir le preview
      // N'enrichir le preview que si l'événement est un vrai message (direction présente)
      const convIdx = state.conversations.findIndex(c => c.id === conversationId);
      if (convIdx !== -1) {
        const isNewMessage  = message.direction != null;
        const isReaction    = message.message_type === 'reaction';
        const isInboundOnInactiveConv =
          message.direction === 'inbound' && conversationId !== state.activeConvId;
        const conv: WaConversation = {
          ...state.conversations[convIdx],
          // last_message_at mis à jour même pour les statuts (reflète l'activité récente)
          ...(isNewMessage ? { last_message_at: message.created_at } : {}),
          // Champs preview uniquement sur un vrai message entrant/sortant (pas status-only, pas réaction)
          ...(isNewMessage && !isReaction ? {
            last_message_body:            message.body === null ? undefined : message.body,
            last_message_direction:       message.direction,
            last_message_delivery_status: message.delivery_status === null ? undefined : message.delivery_status,
            last_message_type:            message.message_type,
          } : {}),
          // Mise à jour du delivery_status dans le preview si c'est le dernier message sortant
          ...(!isNewMessage && message.delivery_status != null &&
            state.conversations[convIdx].last_message_direction === 'outbound' ? {
            last_message_delivery_status: message.delivery_status,
          } : {}),
          ...(isInboundOnInactiveConv && !isReaction ? {
            unread_count: (state.conversations[convIdx].unread_count ?? 0) + 1,
          } : {}),
        };
        state.conversations.splice(convIdx, 1);
        state.conversations.unshift(conv);
      }
    },
  },
  extraReducers: builder => {
    // ── fetchConversations ──
    builder
      .addCase(fetchConversations.pending, s => {
        s.loading = true;
        s.error   = null;
      })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        s.loading       = false;
        s.conversations = a.payload;
      })
      .addCase(fetchConversations.rejected, (s, a) => {
        s.loading = false;
        s.error   = a.payload as string;
      });

    // ── fetchMessages ──
    builder
      .addCase(fetchMessages.pending, (s, a) => {
        // Skeleton uniquement pour le premier chargement (pas le polling)
        if (!s.messages[a.meta.arg.conversationId]?.length) {
          s.loadingMessages = true;
        }
        s.messagesError = null;
      })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        s.loadingMessages = false;
        // Préserver les messages optimistes encore en vol
        const pending = (s.messages[a.payload.conversationId] ?? [])
          .filter(m => m.id.startsWith('tmp_'));
        s.messages[a.payload.conversationId] = [...a.payload.messages, ...pending];
      })
      .addCase(fetchMessages.rejected, (s, a) => {
        s.loadingMessages = false;
        s.messagesError   = a.payload as string;
      });

    // ── startConversation ──
    builder
      .addCase(startConversation.pending, s => {
        s.starting   = true;
        s.startError = null;
      })
      .addCase(startConversation.fulfilled, (s, a) => {
        s.starting                     = false;
        s.conversations.unshift(a.payload);
        s.activeConvId                 = a.payload.id;
        s.messages[a.payload.id]       = [];
      })
      .addCase(startConversation.rejected, (s, a) => {
        s.starting   = false;
        s.startError = a.payload as string;
      });

    // ── replyToConversation ──
    builder
      .addCase(replyToConversation.pending, (s, a) => {
        s.sending   = true;
        s.sendError = null;
        // Message optimiste — affiché immédiatement
        const { conversationId, text } = a.meta.arg;
        const tempMsg: WaMessage = {
          id:               `tmp_${a.meta.requestId}`,
          wamid:            '',
          direction:        'outbound',
          message_type:     'text',
          body:             text ?? '',
          media_id:         null,
          media_url:        null,
          media_filename:   null,
          delivery_status:  'sending',
          error_message:    null,
          meta_timestamp:   new Date().toISOString(),
          created_at:       new Date().toISOString(),
        };
        if (!s.messages[conversationId]) s.messages[conversationId] = [];
        s.messages[conversationId].push(tempMsg);
      })
      .addCase(replyToConversation.fulfilled, (s, a) => {
        s.sending = false;
        const { conversationId, message } = a.payload;
        if (!s.messages[conversationId]) s.messages[conversationId] = [];
        // Remplacer le message optimiste par le vrai
        s.messages[conversationId] = s.messages[conversationId]
          .filter(m => m.id !== `tmp_${a.meta.requestId}`);
        s.messages[conversationId].push(message);
        // Remonter la conversation + enrichir le preview
        const idx = s.conversations.findIndex(c => c.id === conversationId);
        if (idx !== -1) {
          const conv: WaConversation = {
            ...s.conversations[idx],
            last_message_at:              message.created_at,
            last_message_body:            message.body === null ? undefined : message.body,
            last_message_direction:       message.direction,
            last_message_delivery_status: message.delivery_status === null ? undefined : message.delivery_status,
            last_message_type:            message.message_type,
          };
          s.conversations.splice(idx, 1);
          s.conversations.unshift(conv);
        }
      })
      .addCase(replyToConversation.rejected, (s, a) => {
        s.sending   = false;
        s.sendError = a.payload as string;
        // Supprimer le message optimiste en cas d'erreur
        const { conversationId } = a.meta.arg;
        if (s.messages[conversationId]) {
          s.messages[conversationId] = s.messages[conversationId]
            .filter(m => m.id !== `tmp_${a.meta.requestId}`);
        }
      });

    // ── generateConvCr ──
    builder
      .addCase(generateConvCr.pending, s => {
        s.generatingCr = true;
        s.crError      = null;
        s.lastCrId     = null;
      })
      .addCase(generateConvCr.fulfilled, (s, a) => {
        s.generatingCr = false;
        s.lastCrId     = a.payload.id ?? null;
      })
      .addCase(generateConvCr.rejected, (s, a) => {
        s.generatingCr = false;
        s.crError      = a.payload as string;
      });

    // ── linkCrToProspect ──
    builder
      .addCase(linkCrToProspect.pending, s => {
        s.linkingCr   = true;
        s.linkCrError = null;
      })
      .addCase(linkCrToProspect.fulfilled, s => {
        s.linkingCr = false;
      })
      .addCase(linkCrToProspect.rejected, (s, a) => {
        s.linkingCr   = false;
        s.linkCrError = a.payload as string;
      });

    // ── transcribeMessage ──
    builder
      .addCase(transcribeMessage.pending, (s, a) => {
        s.transcribing[a.meta.arg.messageId] = true;
      })
      .addCase(transcribeMessage.fulfilled, (s, a) => {
        s.transcribing[a.payload.messageId]  = false;
        s.transcriptions[a.payload.messageId] = a.payload.text;
      })
      .addCase(transcribeMessage.rejected, (s, a) => {
        s.transcribing[a.meta.arg.messageId] = false;
      })
      .addCase(markConversationRead.fulfilled, (s, a) => {
        const conv = s.conversations.find(c => c.id === a.payload);
        if (conv) conv.unread_count = 0;
      });
  },
});

export const { setActiveConvId, toggleConversationClosed, clearWhatsAppErrors, clearCrState, wsMessageReceived } = whatsappSlice.actions;
export default whatsappSlice.reducer;
