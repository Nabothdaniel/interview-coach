import { collection, doc, type Firestore } from 'firebase/firestore';

/** The only place Firestore paths are spelled out. Keep in sync with firebase/firestore.rules. */
export const questionsCol = (db: Firestore) => collection(db, 'questions');
export const userDoc = (db: Firestore, uid: string) => doc(db, 'users', uid);
export const sessionsCol = (db: Firestore, uid: string) => collection(db, 'users', uid, 'sessions');
