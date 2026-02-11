const DB_NAME = 'coolpeople-draft-blobs'
const STORE_NAME = 'blobs'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveDraftBlob(draftId, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id: draftId, blob, timestamp: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadDraftBlob(draftId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(draftId)
    request.onsuccess = () => {
      const blob = request.result?.blob
      resolve(blob ? URL.createObjectURL(blob) : null)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteDraftBlob(draftId) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(draftId)
  } catch (e) {
    console.warn('Failed to delete draft blob:', e)
  }
}

export async function cleanExpiredDraftBlobs(validDraftIds) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAllKeys()
    request.onsuccess = () => {
      for (const key of request.result) {
        if (!validDraftIds.includes(key)) {
          store.delete(key)
        }
      }
    }
  } catch (e) {
    console.warn('Failed to clean expired draft blobs:', e)
  }
}
