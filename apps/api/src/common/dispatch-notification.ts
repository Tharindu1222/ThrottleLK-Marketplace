import { Logger } from '@nestjs/common';

const logger = new Logger('NotificationDispatch');

/** Detached alerts must never turn a successful business operation into an unhandled rejection. */
export function dispatchNotification(
  work: () => Promise<unknown> | unknown,
): void {
  void Promise.resolve()
    .then(work)
    .catch((error: unknown) => {
      logger.warn(
        `Notification dispatch failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
    });
}
