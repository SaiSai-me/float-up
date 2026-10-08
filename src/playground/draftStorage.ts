import type { FloatUpConfig, FloatUpImageMetadata } from '../float-up'

const DATABASE_NAME = 'float-up-local-draft'
const STORE_NAME = 'scenes'
const DRAFT_KEY = 'current'

export type StoredAsset = {
  fileName: string
  metadata: FloatUpImageMetadata
  blob?: Blob
}

export type StoredDraft = {
  version: 1
  config: FloatUpConfig
  assets: StoredAsset[]
  usingDemo: boolean
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      resolve(database)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Draft database is blocked'))
  })
}

export async function readDraft(): Promise<unknown> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(DRAFT_KEY)
      let result: unknown
      request.onsuccess = () => { result = request.result }
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export async function writeDraft(draft: StoredDraft): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(draft, DRAFT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}
