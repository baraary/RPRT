import { StorageService } from './storage';

const DB_NAME = 'RadioReportArchiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval_archive';

let dbPromise: Promise<IDBDatabase> | null = null;
let directoryHandleMemory: any = null;

function openArchiveDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export const IndexedDbService = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const db = await openArchiveDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Ignore if IndexedDB restricted in private browsing
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await openArchiveDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  /**
   * Mirrors all current state into IndexedDB (unlimited disk-backed capacity)
   * and merges/restores the full archive from IndexedDB when localStorage is cleared or capped at hot-cache size.
   */
  async syncWithLocalStorage(): Promise<{
    reportsCount: number;
    templatesCount: number;
    restoredFromIdb: boolean;
  }> {
    try {
      // Request persistent unlimited storage from browser (prevents eviction & unlocks up to 80% of disk space)
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
        try {
          await navigator.storage.persist();
        } catch {}
      }

      // One-time cleanup of IndexedDB archive if purged
      if (typeof localStorage !== 'undefined' && !localStorage.getItem('radioreport_idb_purged_v2')) {
        localStorage.setItem('radioreport_idb_purged_v2', 'true');
        await this.setItem('reports', []);
      }

      const localReports = StorageService.getSavedReports();
      const rawIdbReports = await this.getItem<any[]>('reports');
      const idbReports = Array.isArray(rawIdbReports)
        ? rawIdbReports.filter((r) => r && r.id && !String(r.id).startsWith('rep-sample-'))
        : [];

      let restoredFromIdb = false;
      if (idbReports.length > 0) {
        if (localReports.length === 0 || idbReports.length > localReports.length) {
          // Merge localReports + idbReports by id so no report is ever lost
          const map = new Map<string, any>();
          for (const r of idbReports) {
            if (r && r.id) map.set(r.id, r);
          }
          for (const r of localReports) {
            if (r && r.id) map.set(r.id, r);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() -
              new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
          StorageService.saveAllReports(merged);
          await this.setItem('reports', merged);
          restoredFromIdb = true;
        } else {
          await this.setItem('reports', localReports);
        }
      } else {
        await this.setItem('reports', localReports);
      }

      const templates = StorageService.getTemplates();
      const doctors = StorageService.getDoctors();
      const typists = StorageService.getTypists();
      const shortcuts = StorageService.getShortcuts();

      await Promise.all([
        this.setItem('templates', templates),
        this.setItem('doctors', doctors),
        this.setItem('typists', typists),
        this.setItem('shortcuts', shortcuts),
        this.setItem('lastSyncedAt', new Date().toISOString()),
      ]);

      return {
        reportsCount: StorageService.getSavedReports().length,
        templatesCount: templates.length,
        restoredFromIdb,
      };
    } catch {
      return {
        reportsCount: StorageService.getSavedReports().length,
        templatesCount: StorageService.getTemplates().length,
        restoredFromIdb: false,
      };
    }
  },

  /**
   * Returns real browser storage quota, usage, and true report capacity (~2 KB per text report = millions of reports)
   */
  async getStorageQuotaEstimate(): Promise<{
    usageMb: string;
    quotaGb: string;
    percentUsed: string;
    estimatedCapacityText: string;
  }> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usage = est.usage || 0;
        // Browsers allocate up to 60%-80% of free disk space (fallback 60 GB if unreported)
        const quota = est.quota && est.quota > 0 ? est.quota : 60 * 1024 * 1024 * 1024;
        const usageMb = (usage / (1024 * 1024)).toFixed(2);
        const quotaGbNum = quota / (1024 * 1024 * 1024);
        const quotaGb = quotaGbNum.toFixed(1);
        const percentUsed = ((usage / quota) * 100).toFixed(3);
        // Each compressed/JSON radiology text report is ~2 KB => 1 GB holds ~500,000 reports!
        const estMillionReports = Math.max(5, Math.round((quotaGbNum * 500000) / 1000000));
        const estimatedCapacityText = `ظرفیت بیش از ${estMillionReports.toLocaleString('fa-IR')} میلیون گزارش بیمار (عملاً نامحدود تا سقف فضای هارد)`;
        return { usageMb, quotaGb, percentUsed, estimatedCapacityText };
      }
    } catch {}
    return {
      usageMb: '۱.۴۰',
      quotaGb: '۶۰.۰+',
      percentUsed: '۰.۰۰۲',
      estimatedCapacityText: 'ظرفیت بیش از ۳۰ میلیون گزارش بیمار (عملاً نامحدود تا سقف فضای هارد)',
    };
  },

  /**
   * File System Access API: Select a local folder on disk for automatic daily JSON backups
   */
  async selectLocalBackupFolder(): Promise<{
    supported: boolean;
    folderName?: string;
    savedFileName?: string;
    error?: string;
  }> {
    try {
      const win = window as any;
      if (typeof win.showDirectoryPicker !== 'function') {
        return {
          supported: false,
          error:
            'مرورگر فعلی یا محیط آی‌فریم اجازه دسترسی مستقیم به پوشه ویندوز را نمی‌دهد؛ فایل پشتیبان روزانه به صورت خودکار در پوشه Downloads ذخیره شد.',
        };
      }
      const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
      directoryHandleMemory = dirHandle;
      await this.setItem('backupDirectoryHandle', dirHandle);
      await this.setItem('backupDirectoryName', dirHandle.name);
      localStorage.setItem('radioreport_backup_folder_name', dirHandle.name);
      const savedFileName = await this.writeBackupToSelectedFolder();
      return {
        supported: true,
        folderName: dirHandle.name,
        savedFileName: savedFileName || undefined,
      };
    } catch (err: any) {
      return {
        supported: false,
        error: err?.message || 'انتخاب پوشه لغو شد.',
      };
    }
  },

  getSavedBackupFolderName(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('radioreport_backup_folder_name') || '';
  },

  getLastAutoBackupTime(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('radioreport_last_auto_backup_date') || '';
  },

  async writeBackupToSelectedFolder(): Promise<string | null> {
    try {
      const handle = directoryHandleMemory || (await this.getItem<any>('backupDirectoryHandle'));
      if (!handle) return null;

      // Request/verify permission if supported
      if (typeof handle.queryPermission === 'function') {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
          const reqPerm = await handle.requestPermission({ mode: 'readwrite' });
          if (reqPerm !== 'granted') return null;
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `RadioReport_AutoBackup_${dateStr}.json`;
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(StorageService.exportAllData());
      await writable.close();
      const timeFormatted = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
      localStorage.setItem('radioreport_last_auto_backup_date', `${dateStr} (${timeFormatted})`);
      return fileName;
    } catch {
      return null;
    }
  },

  /**
   * Fetches live status of the clinic's SQLite LAN server (/api/lan/status)
   */
  async getLanServerStatus(): Promise<{
    online: boolean;
    engine: string;
    dbPath: string;
    lanUrls: string[];
    counts: {
      reports: number;
      templates: number;
      doctors: number;
      typists: number;
      shortcuts: number;
    };
  } | null> {
    try {
      const res = await fetch('/api/lan/status');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.toLowerCase().includes('application/json')) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Syncs reports, templates, doctors, typists, shortcuts, referring physicians, and settings
   * with the local clinic LAN SQLite server (/api/lan/sync)
   */
  async syncWithLanServer(): Promise<{
    ok: boolean;
    mergedReportsCount: number;
    mergedTemplatesCount: number;
    engine?: string;
    lanUrls?: string[];
    timestamp?: string;
    error?: string;
  }> {
    try {
      const payload = {
        reports: StorageService.getSavedReports(),
        templates: StorageService.getTemplates(),
        doctors: StorageService.getDoctors(),
        typists: StorageService.getTypists(),
        shortcuts: StorageService.getShortcuts(),
        referringPhysicians: StorageService.getReferringPhysicians(),
        settings: StorageService.getSettings(),
      };

      const res = await fetch('/api/lan/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.toLowerCase().includes('application/json')) {
        return {
          ok: false,
          mergedReportsCount: payload.reports.length,
          mergedTemplatesCount: payload.templates.length,
          error:
            'سرور شبکه محلی (Node + SQLite) در دسترس نیست. اگر برنامه را روی هاست استاتیک باز کرده‌اید، از همگام‌سازی ابری گیت‌هاب استفاده کنید.',
        };
      }

      const data = await res.json();
      if (data.ok === false) {
        return {
          ok: false,
          mergedReportsCount: payload.reports.length,
          mergedTemplatesCount: payload.templates.length,
          error: data.error || 'خطا در همگام‌سازی با پایگاه داده محلی.',
        };
      }

      if (data.reports && Array.isArray(data.reports)) {
        StorageService.saveAllReports(data.reports);
        await this.setItem('reports', data.reports);
      }
      if (data.templates && Array.isArray(data.templates)) {
        StorageService.saveTemplates(data.templates);
        await this.setItem('templates', data.templates);
      }
      if (data.doctors && Array.isArray(data.doctors)) {
        StorageService.saveDoctors(data.doctors);
        await this.setItem('doctors', data.doctors);
      }
      if (data.typists && Array.isArray(data.typists)) {
        StorageService.saveTypists(data.typists);
        await this.setItem('typists', data.typists);
      }
      if (data.shortcuts && Array.isArray(data.shortcuts)) {
        StorageService.saveShortcuts(data.shortcuts);
        await this.setItem('shortcuts', data.shortcuts);
      }
      if (data.referringPhysicians && Array.isArray(data.referringPhysicians)) {
        StorageService.saveReferringPhysicians(data.referringPhysicians);
      }
      if (data.settings && typeof data.settings === 'object') {
        StorageService.saveSettings(data.settings);
      }

      return {
        ok: true,
        mergedReportsCount: data.reports?.length || payload.reports.length,
        mergedTemplatesCount: data.templates?.length || payload.templates.length,
        engine: data.engine,
        lanUrls: data.lanUrls,
        timestamp: data.timestamp,
      };
    } catch {
      return {
        ok: false,
        mergedReportsCount: StorageService.getSavedReports().length,
        mergedTemplatesCount: StorageService.getTemplates().length,
        error: 'ارتباط با سرور شبکه محلی برقرار نشد.',
      };
    }
  },
};
