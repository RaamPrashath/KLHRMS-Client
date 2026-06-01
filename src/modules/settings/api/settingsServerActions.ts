'use server';

import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@/lib/prisma';

export async function setPasswordAction(params: {
  orgSlug: string;
  memberId: string;
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const { memberId, newPassword } = params;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { userId: true },
  });
  if (!member) {
    return { success: false, error: 'Member not found' };
  }

  const hashed = await hashPassword(newPassword);

  const existing = await prisma.account.findFirst({
    where: { userId: member.userId, providerId: 'credential' },
    select: { id: true },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hashed },
    });
  } else {
    await prisma.account.create({
      data: {
        accountId: member.userId,
        providerId: 'credential',
        userId: member.userId,
        password: hashed,
      },
    });
  }

  return { success: true, message: 'Password updated successfully' };
}
