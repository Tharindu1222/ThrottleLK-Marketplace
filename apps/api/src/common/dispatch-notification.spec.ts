import { Logger } from '@nestjs/common';
import { dispatchNotification } from './dispatch-notification';

describe('dispatchNotification', () => {
  it.each(['rejected promise', 'synchronous exception'])(
    'contains a %s',
    async (failure) => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      dispatchNotification(() => {
        if (failure === 'synchronous exception') throw new Error('Failed');
        return Promise.reject(new Error('Failed'));
      });
      await new Promise(setImmediate);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    },
  );
});
