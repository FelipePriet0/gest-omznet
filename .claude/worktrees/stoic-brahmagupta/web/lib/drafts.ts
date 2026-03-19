// Lightweight IndexedDB helper for drafts (structured-clone safe)

export function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open("mz-drafts", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function saveDraft(id: string, value: any) {
  const db = await openDraftDB();
  const tx = db.transaction("drafts", "readwrite");
  const store = tx.objectStore("drafts");
  store.put({ id, value, updated_at: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getDraft<T = any>(id: string): Promise<{ id: string; value: T; updated_at: number } | null> {
  const db = await openDraftDB();
  const tx = db.transaction("drafts", "readonly");
  const store = tx.objectStore("drafts");
  return new Promise((resolve) => {
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as any) || null);
    req.onerror = () => resolve(null);
  });
}

export async function deleteDraft(id: string) {
  const db = await openDraftDB();
  const tx = db.transaction("drafts", "readwrite");
  tx.objectStore("drafts").delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

