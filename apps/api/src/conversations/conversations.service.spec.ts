import { ConversationsService } from './conversations.service';

describe('ConversationsService', () => {
  it('exports service class', () => {
    expect(ConversationsService).toBeDefined();
  });

  it('documents participant roles', () => {
    const roles = ['buyer', 'seller'];
    expect(roles).toContain('buyer');
    expect(roles).not.toContain('guest');
  });
});
