/* ============================================================
   js/idb.js
   Wrapper IndexedDB pour la persistance des données (images comprises).
   Remplace localStorage dont le quota (5 Mo) est insuffisant.
   API : idbSave(key, value) / idbLoad(key)
   ============================================================ */

const IDB_NAME  = 'labovca_store';
const IDB_STORE = 'data';
const IDB_VER   = 1;

/**
 * idbOpen()
 * Ouvre (ou crée) la base IndexedDB et retourne une Promise<IDBDatabase>.
 */
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/**
 * idbSave(key, value)
 * Enregistre value sous key dans IndexedDB.
 * Retourne une Promise résolue quand la transaction est terminée.
 * @param {string} key
 * @param {*} value
 */
async function idbSave(key, value) {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  } catch (e) {
    console.warn('IDB save error :', e);
  }
}

/**
 * idbLoad(key)
 * Charge et retourne la valeur associée à key depuis IndexedDB.
 * Retourne null si la clé n'existe pas ou en cas d'erreur.
 * @param {string} key
 * @returns {Promise<*>}
 */
async function idbLoad(key) {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch (e) {
    console.warn('IDB load error :', e);
    return null;
  }
}
