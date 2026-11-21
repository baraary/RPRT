import { StorageService } from './storage';
import { IndexedDbService } from './indexedDbStorage';

export interface GitHubUserProfile {
  login: string;
  name: string;
  avatarUrl: string;
}

export interface GitHubSyncStatus {
  serverAvailable: boolean;
  configured: boolean;
  connected: boolean;
  user?: GitHubUserProfile;
  gistUrl?: string;
  callbackUrl: string;
}

export interface GitHubSyncResult {
  ok: boolean;
  mode?: 'merge' | 'push' | 'pull';
  gistUrl?: string;
  user?: GitHubUserProfile;
  counts?: {
    reports: number;
    templates: number;
    doctors: number;
    typists: number;
    shortcuts: number;
  };
  timestamp?: string;
  error?: string;
}

// Opaque session token held strictly in memory (never written to localStorage/sessionStorage)
let memorySessionToken = '';
let memoryUser: GitHubUserProfile | null = null;
let memoryGistUrl = '';
let memoryLastSyncAt = '';

function isTrustedOAuthOrigin(origin: string): boolean {
  if (!origin) return false;
  if (typeof window !== 'undefined' && origin === window.location.origin) return true;
  try {
    const parsed = new URL(origin);
    return (
      parsed.hostname.endsWith('.run.app') ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

async function safeJsonFetch(
  url: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; isJson: boolean; data: any }> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');
    if (!isJson) {
      return { ok: false, status: res.status, isJson: false, data: null };
    }
    const data = await res.json();
    return { ok: res.ok, status: res.status, isJson: true, data };
  } catch {
    return { ok: false, status: 0, isJson: false, data: null };
  }
}

export const GitHubSyncService = {
  isConnectedInMemory(): boolean {
    return Boolean(memorySessionToken && memoryUser);
  },

  getCachedSessionInfo(): {
    connected: boolean;
    user: GitHubUserProfile | null;
    gistUrl: string;
    lastSyncAt: string;
  } {
    return {
      connected: Boolean(memorySessionToken && memoryUser),
      user: memoryUser,
      gistUrl: memoryGistUrl,
      lastSyncAt: memoryLastSyncAt,
    };
  },

  async getStatus(): Promise<GitHubSyncStatus> {
    const fallbackCallback =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/github/callback`
        : '/api/github/callback';

    const headers: Record<string, string> = {};
    if (memorySessionToken) {
      headers.Authorization = `Bearer ${memorySessionToken}`;
    }

    const res = await safeJsonFetch('/api/github/status', { headers });
    if (!res.isJson || !res.data) {
      return {
        serverAvailable: false,
        configured: false,
        connected: false,
        callbackUrl: fallbackCallback,
      };
    }

    const connected = Boolean(res.data.connected);
    if (connected && res.data.user) {
      memoryUser = res.data.user;
      if (res.data.gistUrl) memoryGistUrl = res.data.gistUrl;
    } else if (!connected) {
      memorySessionToken = '';
      memoryUser = null;
    }

    return {
      serverAvailable: true,
      configured: Boolean(res.data.configured),
      connected,
      user: res.data.user || undefined,
      gistUrl: res.data.gistUrl || memoryGistUrl || undefined,
      callbackUrl: res.data.callbackUrl || fallbackCallback,
    };
  },

  async connectWithPopup(): Promise<{
    ok: boolean;
    configured?: boolean;
    callbackUrl?: string;
    user?: GitHubUserProfile;
    error?: string;
  }> {
    const authRes = await safeJsonFetch('/api/github/auth-url');
    if (!authRes.isJson || !authRes.data) {
      return {
        ok: false,
        error:
          'سرور همگام‌سازی در این حالت در دسترس نیست. لطفاً برنامه را با سرور Node اجرا کنید یا از آدرس ابری برنامه استفاده نمایید.',
      };
    }

    if (!authRes.data.configured || !authRes.data.url) {
      return {
        ok: false,
        configured: false,
        callbackUrl: authRes.data.callbackUrl,
        error:
          authRes.data.error ||
          'شناسه GitHub OAuth (GITHUB_CLIENT_ID و GITHUB_CLIENT_SECRET) هنوز در تنظیمات سرور ثبت نشده است.',
      };
    }

    const popup = window.open(
      authRes.data.url,
      'github_oauth_popup',
      'width=600,height=700,menubar=no,toolbar=no,status=no'
    );

    if (!popup) {
      return {
        ok: false,
        configured: true,
        error:
          'مرورگر پنجره ورود گیت‌هاب را مسدود کرد (Popup Blocked). لطفاً اجازه باز شدن پنجره را برای این سایت فعال کنید و دوباره بزنید.',
      };
    }

    return new Promise((resolve) => {
      let settled = false;

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearInterval(closedCheckTimer);
        window.clearTimeout(timeoutTimer);
      };

      const finish = (result: {
        ok: boolean;
        configured?: boolean;
        user?: GitHubUserProfile;
        error?: string;
      }) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const handleMessage = (event: MessageEvent) => {
        if (!isTrustedOAuthOrigin(event.origin)) return;
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'GITHUB_OAUTH_SUCCESS' && typeof msg.sessionToken === 'string') {
          memorySessionToken = msg.sessionToken;
          memoryUser = msg.user || null;
          finish({ ok: true, configured: true, user: memoryUser || undefined });
        } else if (msg.type === 'GITHUB_OAUTH_ERROR') {
          finish({
            ok: false,
            configured: true,
            error: typeof msg.error === 'string' ? msg.error : 'ورود با گیت‌هاب ناموفق بود.',
          });
        }
      };

      window.addEventListener('message', handleMessage);

      const closedCheckTimer = window.setInterval(() => {
        try {
          if (popup.closed) {
            finish({
              ok: false,
              configured: true,
              error: 'پنجره ورود گیت‌هاب پیش از تکمیل اتصال بسته شد.',
            });
          }
        } catch {}
      }, 600);

      const timeoutTimer = window.setTimeout(() => {
        finish({
          ok: false,
          configured: true,
          error: 'زمان اتصال به گیت‌هاب به پایان رسید. لطفاً دوباره تلاش کنید.',
        });
      }, 3 * 60 * 1000);
    });
  },

  async sync(mode: 'merge' | 'push' | 'pull' = 'merge'): Promise<GitHubSyncResult> {
    if (!memorySessionToken) {
      return {
        ok: false,
        error: 'ابتدا با دکمه «اتصال به حساب گیت‌هاب» وارد شوید.',
      };
    }

    const payload = {
      reports: StorageService.getSavedReports(),
      templates: StorageService.getTemplates(),
      doctors: StorageService.getDoctors(),
      typists: StorageService.getTypists(),
      shortcuts: StorageService.getShortcuts(),
      referringPhysicians: StorageService.getReferringPhysicians(),
      settings: StorageService.getSettings(),
    };

    const res = await safeJsonFetch('/api/github/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memorySessionToken}`,
      },
      body: JSON.stringify({ mode, payload }),
    });

    if (!res.isJson || !res.data) {
      return {
        ok: false,
        error: 'پاسخ معتبری از سرور همگام‌سازی گیت‌هاب دریافت نشد.',
      };
    }

    if (res.status === 401) {
      memorySessionToken = '';
      memoryUser = null;
      return {
        ok: false,
        error: res.data.error || 'نشست گیت‌هاب منقضی شده است. لطفاً دوباره متصل شوید.',
      };
    }

    if (!res.ok || !res.data.ok) {
      return {
        ok: false,
        error: res.data.error || 'همگام‌سازی با گیت‌هاب ناموفق بود.',
      };
    }

    const syncedData = res.data.data;
    if (syncedData && typeof syncedData === 'object') {
      if (Array.isArray(syncedData.reports)) {
        StorageService.saveAllReports(syncedData.reports);
        await IndexedDbService.setItem('reports', syncedData.reports);
      }
      if (Array.isArray(syncedData.templates)) {
        StorageService.saveTemplates(syncedData.templates);
        await IndexedDbService.setItem('templates', syncedData.templates);
      }
      if (Array.isArray(syncedData.doctors)) {
        StorageService.saveDoctors(syncedData.doctors);
        await IndexedDbService.setItem('doctors', syncedData.doctors);
      }
      if (Array.isArray(syncedData.typists)) {
        StorageService.saveTypists(syncedData.typists);
        await IndexedDbService.setItem('typists', syncedData.typists);
      }
      if (Array.isArray(syncedData.shortcuts)) {
        StorageService.saveShortcuts(syncedData.shortcuts);
        await IndexedDbService.setItem('shortcuts', syncedData.shortcuts);
      }
      if (Array.isArray(syncedData.referringPhysicians)) {
        StorageService.saveReferringPhysicians(syncedData.referringPhysicians);
      }
      if (syncedData.settings && typeof syncedData.settings === 'object') {
        StorageService.saveSettings(syncedData.settings);
      }
    }

    if (res.data.gistUrl) memoryGistUrl = res.data.gistUrl;
    if (res.data.user) memoryUser = res.data.user;
    memoryLastSyncAt = res.data.timestamp || new Date().toISOString();

    return {
      ok: true,
      mode: res.data.mode || mode,
      gistUrl: res.data.gistUrl || memoryGistUrl,
      user: res.data.user || memoryUser || undefined,
      counts: res.data.counts,
      timestamp: memoryLastSyncAt,
    };
  },

  async disconnect(): Promise<void> {
    const token = memorySessionToken;
    memorySessionToken = '';
    memoryUser = null;
    memoryGistUrl = '';
    memoryLastSyncAt = '';
    if (token) {
      await safeJsonFetch('/api/github/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  },
};
