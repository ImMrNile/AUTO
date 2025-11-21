// Типы для User с Telegram полями
import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;

export type UserWithTelegram = PrismaUser & {
  telegramId: string | null;
  telegramUsername: string | null;
  telegramPhotoUrl: string | null;
  telegramAuthDate: Date | null;
};
