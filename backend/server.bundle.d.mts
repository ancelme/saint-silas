import type { Express } from 'express';

export const app: Express;
export function initializeApp(): Promise<void>;
