import { z } from 'zod';
import { LEVELS, MAX_ROLE_CHARS } from './config';

/** Onboarding answers. Validated wherever they cross a boundary (form, local storage, Firestore). */
export const ProfileSchema = z.object({ targetRole: z.string().trim().min(2).max(MAX_ROLE_CHARS), level: z.enum(LEVELS) });
