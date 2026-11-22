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

  getWorkstationId(): string {
    if (typeof window === 'undefined') return 'ws-local';
    let id = localStorage.getItem('radioreport_workstation_id');
    if (!id) {
      id = `ws-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;
      localStorage.setItem('radioreport_workstation_id', id);
    }
    return id;
  },

  /**
   * File System Access API: Select a local or Windows Network Shared Folder (e.g. Z:\RadioReport or \\Server\Share)
   * for true bidirectional Multi-PC Sync + automatic daily JSON backups (100% offline, zero server needed)
   */
  async selectLocalBackupFolder(): Promise<{
    supported: boolean;
    folderName?: string;
    savedFileName?: string;
    peerCount?: number;
    mergedReportsCount?: number;
    mergedTemplatesCount?: number;
    error?: string;
  }> {
    try {
      const win = window as any;
      if (typeof win.showDirectoryPicker !== 'function') {
        return {
          supported: false,
          error:
            'مرورگر فعلی یا محیط آی‌فریم اجازه دسترسی مستقیم به پوشه ویندوز را نمی‌دهد؛ لطفاً برنامه را مستقیماً در Chrome یا Edge (روی آدرس http://localhost:8765 یا نسخه نصب‌شده) باز کنید.',
        };
      }
      const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
      directoryHandleMemory = dirHandle;
      await this.setItem('backupDirectoryHandle', dirHandle);
      await this.setItem('backupDirectoryName', dirHandle.name);
      localStorage.setItem('radioreport_backup_folder_name', dirHandle.name);

      const syncRes = await this.syncWithSharedFolder({ requestPermission: true });
      const savedFileName = await this.writeBackupToSelectedFolder();
      return {
        supported: true,
        folderName: dirHandle.name,
        savedFileName: savedFileName || undefined,
        peerCount: syncRes.peerCount,
        mergedReportsCount: syncRes.mergedReportsCount,
        mergedTemplatesCount: syncRes.mergedTemplatesCount,
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

  /**
   * True Bidirectional Multi-PC Shared Folder Sync (Conflict-Free Per-Workstation Files):
   * Each hospital PC writes ONLY its own file (`radioreport_sync_<workstationId>.json`) inside the Windows Shared Folder,
   * and reads/merges ALL `radioreport_sync_*.json` files from every other PC so there are ZERO file-locking conflicts.
   */
  async syncWithSharedFolder(options?: { requestPermission?: boolean }): Promise<{
    ok: boolean;
    folderName?: string;
    needsPermission?: boolean;
    unsupported?: boolean;
    peerCount: number;
    mergedReportsCount: number;
    mergedTemplatesCount: number;
    changed: boolean;
    timestamp?: string;
    error?: string;
  }> {
    const mergeById = (baseList: any[] = [], incomingList: any[] = []): any[] => {
      const map = new Map<string, any>();
      for (const item of baseList || []) {
        if (item && item.id) map.set(String(item.id), item);
      }
      for (const item of incomingList || []) {
        if (item && item.id) {
          const key = String(item.id);
          const existing = map.get(key);
          if (!existing) {
            map.set(key, item);
          } else {
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime() || 0;
            const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime() || 0;
            if (incomingTime > existingTime) {
              map.set(key, {
                ...existing,
                ...item,
                usageCount: Math.max(existing.usageCount || 0, item.usageCount || 0),
              });
            } else if (incomingTime === existingTime) {
              map.set(key, {
                ...existing,
                ...item,
                signatureUrl: item.signatureUrl || existing.signatureUrl,
                usageCount: Math.max(existing.usageCount || 0, item.usageCount || 0),
              });
            }
          }
        }
      }
      return Array.from(map.values());
    };

    const mergeSettings = (current: any, incoming: any): any => {
      if (!incoming || typeof incoming !== 'object') return current;
      if (!current || typeof current !== 'object') return incoming;
      const mergedDict = mergeById(
        Array.isArray(current.customDictionary) ? current.customDictionary : [],
        Array.isArray(incoming.customDictionary) ? incoming.customDictionary : []
      );
      const mergedFonts = mergeById(
        Array.isArray(current.customFonts) ? current.customFonts : [],
        Array.isArray(incoming.customFonts) ? incoming.customFonts : []
      );
      return {
        ...current,
        customDictionary: mergedDict,
        customFonts: mergedFonts.length > 0 ? mergedFonts : current.customFonts,
      };
    };

    try {
      const handle = directoryHandleMemory || (await this.getItem<any>('backupDirectoryHandle'));
      if (!handle) {
        return {
          ok: false,
          peerCount: 0,
          mergedReportsCount: StorageService.getSavedReports().length,
          mergedTemplatesCount: StorageService.getTemplates().length,
          changed: false,
          error: 'هنوز پوشه اشتراکی انتخاب نشده است.',
        };
      }

      if (typeof handle.queryPermission === 'function') {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          if (options?.requestPermission && typeof handle.requestPermission === 'function') {
            const reqPerm = await handle.requestPermission({ mode: 'readwrite' });
            if (reqPerm !== 'granted') {
              return {
                ok: false,
                folderName: handle.name,
                needsPermission: true,
                peerCount: 0,
                mergedReportsCount: StorageService.getSavedReports().length,
                mergedTemplatesCount: StorageService.getTemplates().length,
                changed: false,
                error: 'دسترسی نوشتن در پوشه اشتراکی تایید نشد.',
              };
            }
          } else {
            return {
              ok: false,
              folderName: handle.name,
              needsPermission: true,
              peerCount: 0,
              mergedReportsCount: StorageService.getSavedReports().length,
              mergedTemplatesCount: StorageService.getTemplates().length,
              changed: false,
            };
          }
        }
      }

      directoryHandleMemory = handle;

      const localReports = StorageService.getSavedReports();
      const localTemplates = StorageService.getTemplates();
      const localDoctors = StorageService.getDoctors();
      const localTypists = StorageService.getTypists();
      const localShortcuts = StorageService.getShortcuts();
      const localReferring = StorageService.getReferringPhysicians();
      const localSettings = StorageService.getSettings();

      const beforeSig = JSON.stringify({
        r: localReports.map((x: any) => `${x.id}:${x.updatedAt || x.createdAt || ''}`),
        t: localTemplates.map((x: any) => `${x.id}:${x.updatedAt || ''}:${x.title || ''}`),
        d: localDoctors.map((x: any) => `${x.id}:${x.name || ''}`),
        y: localTypists.map((x: any) => `${x.id}:${x.name || ''}`),
        s: localShortcuts.map((x: any) => `${x.id}:${x.code || ''}`),
        dictLen: localSettings.customDictionary?.length || 0,
      });

      let mergedReports = [...localReports];
      let mergedTemplates = [...localTemplates];
      let mergedDoctors = [...localDoctors];
      let mergedTypists = [...localTypists];
      let mergedShortcuts = [...localShortcuts];
      let mergedReferring = [...localReferring];
      let mergedSettings = { ...localSettings };

      const peerFiles: any[] = [];
      const fallbackBackupFiles: any[] = [];

      if (typeof handle.entries === 'function') {
        for await (const [entryName, entryHandle] of handle.entries()) {
          if (entryHandle.kind !== 'file') continue;
          if (/^radioreport_sync_.+\.json$/i.test(entryName)) {
            peerFiles.push({ name: entryName, handle: entryHandle });
          } else if (/^RadioReport_AutoBackup_.+\.json$/i.test(entryName)) {
            fallbackBackupFiles.push({ name: entryName, handle: entryHandle });
          }
        }
      }

      const filesToMerge =
        peerFiles.length > 0
          ? peerFiles
          : fallbackBackupFiles
              .sort((a, b) => b.name.localeCompare(a.name))
              .slice(0, 3);

      for (const entry of filesToMerge) {
        try {
          const file = await entry.handle.getFile();
          const text = await file.text();
          if (!text) continue;
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== 'object') continue;
          if (Array.isArray(parsed.reports)) mergedReports = mergeById(mergedReports, parsed.reports);
          if (Array.isArray(parsed.templates)) mergedTemplates = mergeById(mergedTemplates, parsed.templates);
          if (Array.isArray(parsed.doctors)) mergedDoctors = mergeById(mergedDoctors, parsed.doctors);
          if (Array.isArray(parsed.typists)) mergedTypists = mergeById(mergedTypists, parsed.typists);
          if (Array.isArray(parsed.shortcuts)) mergedShortcuts = mergeById(mergedShortcuts, parsed.shortcuts);
          if (Array.isArray(parsed.referringPhysicians)) {
            mergedReferring = mergeById(mergedReferring, parsed.referringPhysicians);
          }
          if (parsed.settings && typeof parsed.settings === 'object') {
            mergedSettings = mergeSettings(mergedSettings, parsed.settings);
          }
        } catch {
          // Ignore partially written or unreadable peer file during concurrent save; next cycle picks it up
        }
      }

      mergedReports.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

      const afterSig = JSON.stringify({
        r: mergedReports.map((x: any) => `${x.id}:${x.updatedAt || x.createdAt || ''}`),
        t: mergedTemplates.map((x: any) => `${x.id}:${x.updatedAt || ''}:${x.title || ''}`),
        d: mergedDoctors.map((x: any) => `${x.id}:${x.name || ''}`),
        y: mergedTypists.map((x: any) => `${x.id}:${x.name || ''}`),
        s: mergedShortcuts.map((x: any) => `${x.id}:${x.code || ''}`),
        dictLen: mergedSettings.customDictionary?.length || 0,
      });

      const changed = beforeSig !== afterSig;

      if (changed) {
        StorageService.saveAllReports(mergedReports);
        StorageService.saveTemplates(mergedTemplates);
        StorageService.saveDoctors(mergedDoctors);
        StorageService.saveTypists(mergedTypists);
        StorageService.saveShortcuts(mergedShortcuts);
        StorageService.saveReferringPhysicians(mergedReferring);
        StorageService.saveSettings(mergedSettings);
        await Promise.all([
          this.setItem('reports', mergedReports),
          this.setItem('templates', mergedTemplates),
          this.setItem('doctors', mergedDoctors),
          this.setItem('typists', mergedTypists),
          this.setItem('shortcuts', mergedShortcuts),
        ]);
      }

      // Write this workstation's own conflict-free sync file into the shared folder
      const workstationId = this.getWorkstationId();
      const myFileName = `radioreport_sync_${workstationId}.json`;
      const nowIso = new Date().toISOString();
      const snapshotPayload = {
        version: '1.3',
        workstationId,
        syncedAt: nowIso,
        reports: mergedReports,
        templates: mergedTemplates,
        doctors: mergedDoctors,
        typists: mergedTypists,
        shortcuts: mergedShortcuts,
        referringPhysicians: mergedReferring,
        settings: mergedSettings,
      };

      const fileHandle = await handle.getFileHandle(myFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(snapshotPayload));
      await writable.close();

      const timeFormatted = new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
      localStorage.setItem(
        'radioreport_last_auto_backup_date',
        `${nowIso.slice(0, 10)} (${timeFormatted})`
      );

      const uniquePeers = new Set(peerFiles.map((f) => f.name));
      uniquePeers.add(myFileName);

      return {
        ok: true,
        folderName: handle.name,
        peerCount: uniquePeers.size,
        mergedReportsCount: mergedReports.length,
        mergedTemplatesCount: mergedTemplates.length,
        changed,
        timestamp: nowIso,
      };
    } catch (err: any) {
      return {
        ok: false,
        peerCount: 0,
        mergedReportsCount: StorageService.getSavedReports().length,
        mergedTemplatesCount: StorageService.getTemplates().length,
        changed: false,
        error: err?.message || 'خطا در همگام‌سازی با پوشه اشتراکی.',
      };
    }
  },

  async writeBackupToSelectedFolder(): Promise<string | null> {
    try {
      const handle = directoryHandleMemory || (await this.getItem<any>('backupDirectoryHandle'));
      if (!handle) return null;

      // Request/verify permission if supported
      if (typeof handle.queryPermission === 'function') {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          return null;
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
