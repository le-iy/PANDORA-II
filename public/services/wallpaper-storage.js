const storeName = "wallpapers";

export function isUploadedWallpaper(id) {
  return typeof id === "string" && /^upload:[\da-f-]{36}$/.test(id);
}

async function requestWallpaper(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("pandora-ii.wallpapers", 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error("Wallpaper storage was interrupted."));
    });
  } finally {
    database.close();
  }
}

export async function listWallpapers() {
  const records = await requestWallpaper("readonly", store => store.getAll());
  return records.map(({ id, name }) => ({ id, name }));
}

export const readWallpaper = id => requestWallpaper("readonly", store => store.get(id));
export const saveWallpaper = wallpaper => requestWallpaper("readwrite", store => store.put(wallpaper));
