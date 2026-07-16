import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { GetData, PatchData, PutData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

/* ── Types API ──────────────────────────────────────────────────────────── */

export interface ApiNotification {
  id:                string;
  notification_type: string;
  title:             string;
  body:              string;
  status:            'read' | 'unread';
  reference_type?:   string | null;
  reference_id?:     string | null;
  data?:             Record<string, unknown> | null;
  created_at:        string;
  read_at?:          string | null;
}

interface NotificationsListResponse {
  unread_count: number;
  items:        ApiNotification[];
}

interface NotificationsState {
  // Device FCM
  fcmToken:    string | null;
  permission:  NotificationPermission | 'unsupported';
  registering: boolean;

  // Server notifications
  items:       ApiNotification[];
  unreadCount: number;
  loading:     boolean;
  loadingMore: boolean;
  hasMore:     boolean;
  offset:      number;

  // Mutation states
  markingAllRead: boolean;
}

const PAGE_SIZE = 20;

/* ── Thunks ─────────────────────────────────────────────────────────────── */

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (params: { unread_only?: boolean; offset?: number } = {}, { rejectWithValue }) => {
    const { unread_only = false, offset = 0 } = params;
    const url = `${ApiRoutes.NOTIFICATIONS}?unread_only=${unread_only}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await GetData<NotificationsListResponse>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement notifications');
    return { data: res.data!, offset };
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    const res = await GetData<{ unread_count: number }>({
      url: ApiRoutes.NOTIFICATIONS_UNREAD_COUNT,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error);
    return res.data!.unread_count;
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string, { rejectWithValue }) => {
    const res = await PatchData<ApiNotification>({
      url:       ApiRoutes.NOTIFICATION_READ(id),
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error);
    return res.data!;
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    const res = await PatchData<{ marked_read: number }>({
      url:       ApiRoutes.NOTIFICATIONS_READ_ALL,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error);
    return res.data!.marked_read;
  }
);

export const registerDevice = createAsyncThunk(
  'notifications/registerDevice',
  async (fcmToken: string, { rejectWithValue }) => {
    const res = await PutData({
      url:       ApiRoutes.NOTIFICATIONS_DEVICE_REG,
      data:      {
        fcm_token:   fcmToken,
        platform:    'web',
        device_name: typeof navigator !== 'undefined' ? (navigator.userAgent.slice(0, 120)) : 'Web Browser',
      },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Device registration failed');
    return fcmToken;
  }
);

export const unregisterDevice = createAsyncThunk(
  'notifications/unregisterDevice',
  async (fcmToken: string, { rejectWithValue }) => {
    const res = await DeleteData({
      url: `${ApiRoutes.NOTIFICATIONS_DEVICE_UNREG}?fcm_token=${encodeURIComponent(fcmToken)}`,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error);
    return fcmToken;
  }
);

/* ── Slice ──────────────────────────────────────────────────────────────── */

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    fcmToken:       null,
    permission:     'default',
    registering:    false,
    items:          [],
    unreadCount:    0,
    loading:        false,
    loadingMore:    false,
    hasMore:        false,
    offset:         0,
    markingAllRead: false,
  } as NotificationsState,

  reducers: {
    setFcmToken(state, action: PayloadAction<string>) {
      state.fcmToken = action.payload;
    },
    setPermission(state, action: PayloadAction<NotificationsState['permission']>) {
      state.permission = action.payload;
    },
    // Foreground push reçu : incrémente badge sans recharger toute la liste
    addForegroundNotification(state, action: PayloadAction<Pick<ApiNotification, 'title' | 'body' | 'notification_type'>>) {
      state.unreadCount += 1;
      state.items.unshift({
        id:                Math.random().toString(36).slice(2),
        notification_type: action.payload.notification_type ?? 'info',
        title:             action.payload.title,
        body:              action.payload.body,
        status:            'unread',
        created_at:        new Date().toISOString(),
        read_at:           null,
      });
    },
  },

  extraReducers: builder => {
    // fetchNotifications
    builder.addCase(fetchNotifications.pending, (s, action) => {
      if (action.meta.arg.offset === 0) s.loading     = true;
      else                               s.loadingMore = true;
    });
    builder.addCase(fetchNotifications.fulfilled, (s, action) => {
      s.loading     = false;
      s.loadingMore = false;
      const { data, offset } = action.payload;
      if (offset === 0) {
        s.items = data.items;
      } else {
        s.items.push(...data.items);
      }
      s.unreadCount = data.unread_count;
      s.offset      = offset + data.items.length;
      s.hasMore     = data.items.length === PAGE_SIZE;
    });
    builder.addCase(fetchNotifications.rejected, s => {
      s.loading = false; s.loadingMore = false;
    });

    // fetchUnreadCount
    builder.addCase(fetchUnreadCount.fulfilled, (s, action) => {
      s.unreadCount = action.payload;
    });

    // markNotificationRead — optimistic
    builder.addCase(markNotificationRead.pending, (s, action) => {
      const n = s.items.find(i => i.id === action.meta.arg);
      if (n && n.status === 'unread') {
        n.status  = 'read';
        n.read_at = new Date().toISOString();
        s.unreadCount = Math.max(0, s.unreadCount - 1);
      }
    });
    builder.addCase(markNotificationRead.fulfilled, (s, action) => {
      const idx = s.items.findIndex(i => i.id === action.payload.id);
      if (idx !== -1) s.items[idx] = action.payload;
    });
    builder.addCase(markNotificationRead.rejected, (s, action) => {
      // Rollback optimistic update
      const n = s.items.find(i => i.id === action.meta.arg as string);
      if (n) { n.status = 'unread'; n.read_at = null; s.unreadCount += 1; }
    });

    // markAllNotificationsRead
    builder.addCase(markAllNotificationsRead.pending,   s => { s.markingAllRead = true; });
    builder.addCase(markAllNotificationsRead.fulfilled, s => {
      s.markingAllRead = false;
      s.items.forEach(n => { n.status = 'read'; n.read_at = new Date().toISOString(); });
      s.unreadCount = 0;
    });
    builder.addCase(markAllNotificationsRead.rejected, s => { s.markingAllRead = false; });

    // registerDevice
    builder.addCase(registerDevice.pending,   s => { s.registering = true;  });
    builder.addCase(registerDevice.fulfilled, (s, action) => {
      s.registering = false;
      s.fcmToken    = action.payload;
    });
    builder.addCase(registerDevice.rejected,  s => { s.registering = false; });

    // unregisterDevice
    builder.addCase(unregisterDevice.fulfilled, s => { s.fcmToken = null; });
  },
});

export const { setFcmToken, setPermission, addForegroundNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
