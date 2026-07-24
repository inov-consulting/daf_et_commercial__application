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
}

export interface WaMessage {
  id: string;
  wamid: string;
  direction: string;        // "inbound" | "outbound"
  message_type: string;     // "text" | "image" | "audio" | "document" | "video"
  body: string;
  media_id: string | null;
  media_url: string | null;
  media_filename: string | null;
  delivery_status: string;
  error_message: string | null;
  meta_timestamp: string;
  created_at: string;
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
    if (text) payload.text = text;
    if (file) payload.file = file;

    const res = await PostData<WaMessage>({
      url:         ApiRoutes.WHATSAPP_REPLY(conversationId),
      data:        payload,
      protected:   true,
      ...(file ? { isMultipart: true } : {}),
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
      .addCase(fetchMessages.pending, s => {
        s.loadingMessages = true;
        s.messagesError   = null;
      })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        s.loadingMessages               = false;
        s.messages[a.payload.conversationId] = a.payload.messages;
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
      .addCase(replyToConversation.pending, s => {
        s.sending   = true;
        s.sendError = null;
      })
      .addCase(replyToConversation.fulfilled, (s, a) => {
        s.sending = false;
        const { conversationId, message } = a.payload;
        if (!s.messages[conversationId]) s.messages[conversationId] = [];
        s.messages[conversationId].push(message);
        // Move conversation to top of list and update timestamp
        const idx = s.conversations.findIndex(c => c.id === conversationId);
        if (idx !== -1) {
          const conv = { ...s.conversations[idx], last_message_at: message.created_at };
          s.conversations.splice(idx, 1);
          s.conversations.unshift(conv);
        }
      })
      .addCase(replyToConversation.rejected, (s, a) => {
        s.sending   = false;
        s.sendError = a.payload as string;
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
  },
});

export const { setActiveConvId, toggleConversationClosed, clearWhatsAppErrors, clearCrState } = whatsappSlice.actions;
export default whatsappSlice.reducer;
