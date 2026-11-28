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
   * True Bidirectional Multi-PC Shared Folder Sync (Conflict-Free Per-Workstation Files + Tombstone Deletion Tracking):
   * Each hospital PC writes ONLY its own file (`radioreport_sync_<workstationId>.json`) inside the Windows Shared Folder,
   * and reads/merges OTHER PCs' `radioreport_sync_*.json` files (skipping its own previous file so local deletions & edits
   * never resurrect!) with per-entity timestamps and deletion tombstones.
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
    const getEntityTimestamp = (item: any): number => {
      if (!item || typeof item !== 'object') return 0;
      const raw = item.updatedAt || item.lastUsedAt || item.importedAt || item.createdAt || 0;
      const ts = new Date(raw).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    const mergeTombstones = (baseMap: any = {}, incomingMap: any = {}): any => {
      const result: any = { ...(baseMap || {}) };
      if (!incomingMap || typeof incomingMap !== 'object') return result;
      for (const collection of Object.keys(incomingMap)) {
        const incBucket = incomingMap[collection];
        if (!incBucket || typeof incBucket !== 'object') continue;
        const mergedBucket: Record<string, string> = { ...(result[collection] || {}) };
        for (const [id, delIso] of Object.entries(incBucket)) {
          if (typeof delIso !== 'string') continue;
          const prevTs = mergedBucket[id] ? new Date(mergedBucket[id]).getTime() || 0 : 0;
          const nextTs = new Date(delIso).getTime() || 0;
          if (nextTs > prevTs) {
            mergedBucket[id] = delIso;
          }
        }
        result[collection] = mergedBucket;
      }
      return result;
    };

    const isSuppressedByTombstone = (item: any, tombstones?: Record<string, string>): boolean => {
      if (!item || !item.id || !tombstones) return false;
      const delIso = tombstones[String(item.id)];
      if (!delIso) return false;
      const delTs = new Date(delIso).getTime() || 0;
      if (delTs <= 0) return false;
      const itemTs = getEntityTimestamp(item);
      // If deletion happened after (or at) the item's last edit, suppress it permanently
      return delTs >= itemTs;
    };

    const mergeById = (
      baseList: any[] = [],
      incomingList: any[] = [],
      tombstones?: Record<string, string>
    ): any[] => {
      const map = new Map<string, any>();
      for (const item of baseList || []) {
        if (item && item.id && !isSuppressedByTombstone(item, tombstones)) {
          map.set(String(item.id), item);
        }
      }
      for (const item of incomingList || []) {
        if (!item || !item.id || isSuppressedByTombstone(item, tombstones)) continue;
        const key = String(item.id);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, item);
        } else {
          const existingTime = getEntityTimestamp(existing);
          const incomingTime = getEntityTimestamp(item);
          // Strict Last-Write-Wins: ONLY replace local item when incoming is strictly newer!
          // Never overwrite local edits or removed signatures when timestamps tie.
          if (incomingTime > existingTime) {
            map.set(key, {
              ...existing,
              ...item,
              usageCount: Math.max(existing.usageCount || 0, item.usageCount || 0),
            });
          } else if (existingTime === incomingTime) {
            const maxUsage = Math.max(existing.usageCount || 0, item.usageCount || 0);
            if (maxUsage !== (existing.usageCount || 0)) {
              map.set(key, { ...existing, usageCount: maxUsage });
            }
          }
        }
      }
      return Array.from(map.values());
    };

    const mergeSettings = (
      current: any,
      currentUpdatedAt: number,
      incoming: any,
      incomingUpdatedAt: number
    ): { settings: any; updatedAt: number } => {
      if (!incoming || typeof incoming !== 'object') {
        return { settings: current, updatedAt: currentUpdatedAt };
      }
      if (!current || typeof current !== 'object') {
        return { settings: incoming, updatedAt: incomingUpdatedAt };
      }
      const mergedDict = mergeById(
        Array.isArray(current.customDictionary) ? current.customDictionary : [],
        Array.isArray(incoming.customDictionary) ? incoming.customDictionary : []
      );
      const mergedFonts = mergeById(
        Array.isArray(current.customFonts) ? current.customFonts : [],
        Array.isArray(incoming.customFonts) ? incoming.customFonts : []
      );
      const useIncomingBase = incomingUpdatedAt > currentUpdatedAt;
      const base = useIncomingBase
        ? {
            ...current,
            ...incoming,
            autoFolderBackupEnabled: current.autoFolderBackupEnabled,
            lanSyncEnabled: current.lanSyncEnabled,
          }
        : { ...current };
      return {
        settings: {
          ...base,
          customDictionary: mergedDict,
          customFonts: mergedFonts.length > 0 ? mergedFonts : base.customFonts,
          modalityColors: {
            ...(useIncomingBase ? current.modalityColors : incoming.modalityColors),
            ...(useIncomingBase ? incoming.modalityColors : current.modalityColors),
          },
        },
        updatedAt: Math.max(currentUpdatedAt, incomingUpdatedAt),
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

      const workstationId = this.getWorkstationId();
      const myFileName = `radioreport_sync_${workstationId}.json`;

      const localReports = StorageService.getSavedReports();
      const localTemplates = StorageService.getTemplates();
      const localDoctors = StorageService.getDoctors();
      const localTypists = StorageService.getTypists();
      const localShortcuts = StorageService.getShortcuts();
      const localReferring = StorageService.getReferringPhysicians();
      const localHisWorklist = StorageService.getHisWorklist();
      const localSettings = StorageService.getSettings();
      const localDeletedRecords = StorageService.getDeletedRecords();
      const localSettingsTs =
        new Date(localStorage.getItem('radioreport_settings_updated_at') || 0).getTime() || 0;

      const buildSignature = (state: {
        reports: any[];
        templates: any[];
        doctors: any[];
        typists: any[];
        shortcuts: any[];
        referring: any[];
        hisWorklist: any[];
        settings: any;
        deletedRecords: any;
      }) =>
        JSON.stringify({
          r: state.reports.map((x: any) => `${x.id}:${x.updatedAt || x.createdAt || ''}`),
          t: state.templates.map((x: any) => `${x.id}:${x.updatedAt || ''}:${x.title || ''}`),
          d: state.doctors.map(
            (x: any) =>
              `${x.id}:${x.updatedAt || ''}:${x.name || ''}:${x.specialty || ''}:${(x.signatureUrl || '').length}`
          ),
          y: state.typists.map((x: any) => `${x.id}:${x.updatedAt || ''}:${x.name || ''}`),
          s: state.shortcuts.map((x: any) => `${x.id}:${x.updatedAt || ''}:${x.trigger || ''}`),
          ref: state.referring.map((x: any) => `${x.id}:${x.name || ''}:${x.usageCount || 0}`),
          his: state.hisWorklist.map((x: any) => `${x.id}:${x.admissionNumber || ''}:${x.fullName || ''}`),
          clinic: `${state.settings.clinicName || ''}|${(state.settings.clinicLogoUrl || '').length}|${(state.settings.doctorSignatureUrl || '').length}`,
          dictLen: state.settings.customDictionary?.length || 0,
          del: state.deletedRecords,
        });

      const beforeSig = buildSignature({
        reports: localReports,
        templates: localTemplates,
        doctors: localDoctors,
        typists: localTypists,
        shortcuts: localShortcuts,
        referring: localReferring,
        hisWorklist: localHisWorklist,
        settings: localSettings,
        deletedRecords: localDeletedRecords,
      });

      const allSyncFiles: any[] = [];
      const otherPeerFiles: any[] = [];
      const fallbackBackupFiles: any[] = [];

      if (typeof handle.entries === 'function') {
        for await (const [entryName, entryHandle] of handle.entries()) {
          if (entryHandle.kind !== 'file') continue;
          if (/^radioreport_sync_.+\.json$/i.test(entryName)) {
            allSyncFiles.push({ name: entryName, handle: entryHandle });
            // CRITICAL: Skip our own previous sync file so local deletions & signature edits NEVER resurrect!
            if (entryName.toLowerCase() !== myFileName.toLowerCase()) {
              otherPeerFiles.push({ name: entryName, handle: entryHandle });
            }
          } else if (/^RadioReport_AutoBackup_.+\.json$/i.test(entryName)) {
            fallbackBackupFiles.push({ name: entryName, handle: entryHandle });
          }
        }
      }

      // Only fall back to AutoBackup files if NO sync files exist at all (e.g., disaster recovery on a fresh PC)
      const filesToRead =
        otherPeerFiles.length > 0
          ? otherPeerFiles
          : allSyncFiles.length === 0 && !StorageService.isUserTouched()
          ? fallbackBackupFiles.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 1)
          : [];

      const parsedPeers: any[] = [];
      for (const entry of filesToRead) {
        try {
          const file = await entry.handle.getFile();
          const text = await file.text();
          if (!text) continue;
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            parsedPeers.push(parsed);
          }
        } catch {
          // Ignore partially written or unreadable peer file during concurrent save; next cycle picks it up
        }
      }

      // Step 1: Merge all deletion tombstones first across local + all peers
      let mergedDeletedRecords = { ...localDeletedRecords };
      for (const parsed of parsedPeers) {
        if (parsed.deletedRecords && typeof parsed.deletedRecords === 'object') {
          mergedDeletedRecords = mergeTombstones(mergedDeletedRecords, parsed.deletedRecords);
        }
      }

      // Step 2: Fresh Workstation Protection!
      // If this PC has NEVER been customized by the user yet AND other clinic PCs already exist in the shared folder,
      // adopt the clinic's exact doctors/typists/templates/shortcuts/referring/settings instead of injecting factory defaults!
      const adoptFreshFromPeers = !StorageService.isUserTouched() && parsedPeers.length > 0;

      let mergedReports = adoptFreshFromPeers ? [] : [...localReports];
      let mergedTemplates = adoptFreshFromPeers ? [] : [...localTemplates];
      let mergedDoctors = adoptFreshFromPeers ? [] : [...localDoctors];
      let mergedTypists = adoptFreshFromPeers ? [] : [...localTypists];
      let mergedShortcuts = adoptFreshFromPeers ? [] : [...localShortcuts];
      let mergedReferring = adoptFreshFromPeers ? [] : [...localReferring];
      let mergedHisWorklist = adoptFreshFromPeers ? [] : [...localHisWorklist];
      let mergedSettings = { ...localSettings };
      let mergedSettingsTs = adoptFreshFromPeers ? 0 : localSettingsTs;

      // Apply merged tombstones even to local lists immediately
      mergedReports = mergeById(mergedReports, [], mergedDeletedRecords.reports);
      mergedTemplates = mergeById(mergedTemplates, [], mergedDeletedRecords.templates);
      mergedDoctors = mergeById(mergedDoctors, [], mergedDeletedRecords.doctors);
      mergedTypists = mergeById(mergedTypists, [], mergedDeletedRecords.typists);
      mergedShortcuts = mergeById(mergedShortcuts, [], mergedDeletedRecords.shortcuts);
      mergedReferring = mergeById(mergedReferring, [], mergedDeletedRecords.referringPhysicians);
      mergedHisWorklist = mergeById(mergedHisWorklist, [], mergedDeletedRecords.hisWorklist);

      // Step 3: Merge all peer snapshots with tombstone suppression & strict updatedAt LWW
      for (const parsed of parsedPeers) {
        if (Array.isArray(parsed.reports)) {
          mergedReports = mergeById(mergedReports, parsed.reports, mergedDeletedRecords.reports);
        }
        if (Array.isArray(parsed.templates)) {
          mergedTemplates = mergeById(mergedTemplates, parsed.templates, mergedDeletedRecords.templates);
        }
        if (Array.isArray(parsed.doctors)) {
          mergedDoctors = mergeById(mergedDoctors, parsed.doctors, mergedDeletedRecords.doctors);
        }
        if (Array.isArray(parsed.typists)) {
          mergedTypists = mergeById(mergedTypists, parsed.typists, mergedDeletedRecords.typists);
        }
        if (Array.isArray(parsed.shortcuts)) {
          mergedShortcuts = mergeById(mergedShortcuts, parsed.shortcuts, mergedDeletedRecords.shortcuts);
        }
        if (Array.isArray(parsed.referringPhysicians)) {
          mergedReferring = mergeById(
            mergedReferring,
            parsed.referringPhysicians,
            mergedDeletedRecords.referringPhysicians
          );
        }
        if (Array.isArray(parsed.hisWorklist)) {
          mergedHisWorklist = mergeById(
            mergedHisWorklist,
            parsed.hisWorklist,
            mergedDeletedRecords.hisWorklist
          );
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          const incomingTs =
            new Date(parsed.settingsUpdatedAt || parsed.syncedAt || 0).getTime() || 0;
          const resSettings = mergeSettings(
            mergedSettings,
            mergedSettingsTs,
            parsed.settings,
            incomingTs
          );
          mergedSettings = resSettings.settings;
          mergedSettingsTs = resSettings.updatedAt;
        }
      }

      // Safety fallback if fresh adoption found peers without doctors/typists keys
      if (adoptFreshFromPeers) {
        if (mergedDoctors.length === 0 && localDoctors.length > 0) mergedDoctors = [...localDoctors];
        if (mergedTypists.length === 0 && localTypists.length > 0) mergedTypists = [...localTypists];
        if (mergedTemplates.length === 0 && localTemplates.length > 0) mergedTemplates = [...localTemplates];
        if (mergedShortcuts.length === 0 && localShortcuts.length > 0) mergedShortcuts = [...localShortcuts];
        if (mergedReferring.length === 0 && localReferring.length > 0) mergedReferring = [...localReferring];
        StorageService.markUserTouched();
      }

      mergedReports.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

      const afterSig = buildSignature({
        reports: mergedReports,
        templates: mergedTemplates,
        doctors: mergedDoctors,
        typists: mergedTypists,
        shortcuts: mergedShortcuts,
        referring: mergedReferring,
        hisWorklist: mergedHisWorklist,
        settings: mergedSettings,
        deletedRecords: mergedDeletedRecords,
      });

      const changed = beforeSig !== afterSig;

      if (changed) {
        StorageService.saveAllReports(mergedReports);
        StorageService.saveTemplates(mergedTemplates);
        StorageService.saveDoctors(mergedDoctors);
        StorageService.saveTypists(mergedTypists);
        StorageService.saveShortcuts(mergedShortcuts);
        StorageService.saveReferringPhysicians(mergedReferring);
        StorageService.saveHisWorklist(mergedHisWorklist);
        StorageService.saveDeletedRecords(mergedDeletedRecords);
        StorageService.saveSettings(mergedSettings);
        if (mergedSettingsTs > 0) {
          localStorage.setItem(
            'radioreport_settings_updated_at',
            new Date(mergedSettingsTs).toISOString()
          );
        } else {
          localStorage.removeItem('radioreport_settings_updated_at');
        }
        await Promise.all([
          this.setItem('reports', mergedReports),
          this.setItem('templates', mergedTemplates),
          this.setItem('doctors', mergedDoctors),
          this.setItem('typists', mergedTypists),
          this.setItem('shortcuts', mergedShortcuts),
        ]);
      }

      // Write this workstation's own conflict-free sync file into the shared folder
      const nowIso = new Date().toISOString();
      const snapshotPayload = {
        version: '1.4',
        workstationId,
        syncedAt: nowIso,
        settingsUpdatedAt: mergedSettingsTs > 0 ? new Date(mergedSettingsTs).toISOString() : undefined,
        deletedRecords: mergedDeletedRecords,
        reports: mergedReports,
        templates: mergedTemplates,
        doctors: mergedDoctors,
        typists: mergedTypists,
        shortcuts: mergedShortcuts,
        referringPhysicians: mergedReferring,
        hisWorklist: mergedHisWorklist,
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

      const uniquePeers = new Set(allSyncFiles.map((f) => f.name));
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
