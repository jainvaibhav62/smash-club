import type { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore'

/** Generic converter: stores objects as-is, reads back with `id` set from the doc id. */
export function converter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => {
      const { id: _id, ...rest } = data
      return rest
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot) => {
      return { id: snapshot.id, ...snapshot.data() } as T
    },
  }
}
