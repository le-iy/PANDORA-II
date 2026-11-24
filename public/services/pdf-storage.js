const databaseName = "pandora-ii.documents";
const storeName = "pdfs";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    let blocked = false;

    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "id" });
    };

    request.onsuccess = () => {
      const database = request.result;

      if (blocked) {
        database.close();
        return;
      }

      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onerror = () => reject(request.error);

    request.onblocked = () => {
      blocked = true;
      reject(new Error("Close other PANDORA II tabs and retry."));
    };
  });
}

async function runTransaction(mode, operation) {
  const database = await openDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));

      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => {
        reject(transaction.error ?? new Error("The document operation was interrupted."));
      };
    });
  } finally {
    database.close();
  }
}

export function listStoredPdfs() {
  return runTransaction("readonly", (store) => store.getAll());
}

export function listStoredPdfIds() {
  return runTransaction("readonly", (store) => store.getAllKeys());
}

export function storePdf(record) {
  return runTransaction("readwrite", (store) => store.add(record));
}

export function deleteStoredPdf(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}