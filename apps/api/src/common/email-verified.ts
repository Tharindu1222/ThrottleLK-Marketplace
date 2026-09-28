import { ForbiddenException } from '@nestjs/common';

export function assertEmailVerified(
  user: { emailVerifiedAt?: Date | null },
  action: string,
): void {
  if (!user.emailVerifiedAt) {
    throw new ForbiddenException({
      success: false,
      error: {
        code: 'EMAIL_UNVERIFIED',
        message: `Verify your email before ${action}`,
      },
    });
  }
}
