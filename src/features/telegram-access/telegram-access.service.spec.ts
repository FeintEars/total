import { TelegramAccessService } from './telegram-access.service.js';

function setup({ users = false, chats = false } = {}) {
  const usersRepository = { existsBy: vi.fn().mockResolvedValue(users) };
  const chatsRepository = { existsBy: vi.fn().mockResolvedValue(chats) };
  return {
    users: usersRepository,
    chats: chatsRepository,
    access: new TelegramAccessService(
      usersRepository as never,
      chatsRepository as never,
    ),
  };
}

describe('TelegramAccessService.allows', () => {
  it('checks a private chat against the allowed users', async () => {
    const { access, users, chats } = setup({ users: true });

    await expect(
      access.allows({ id: 123456789, type: 'private' }),
    ).resolves.toBe(true);
    expect(users.existsBy).toHaveBeenCalledWith({ userId: '123456789' });
    expect(chats.existsBy).not.toHaveBeenCalled();
  });

  it('checks a group against the allowed chats', async () => {
    const { access, users, chats } = setup({ chats: true });

    await expect(
      access.allows({ id: -1001234567890, type: 'supergroup' }),
    ).resolves.toBe(true);
    expect(chats.existsBy).toHaveBeenCalledWith({ chatId: '-1001234567890' });
    expect(users.existsBy).not.toHaveBeenCalled();
  });

  it('denies a chat missing from the tables', async () => {
    const { access } = setup();

    await expect(access.allows({ id: 42, type: 'private' })).resolves.toBe(
      false,
    );
    await expect(access.allows({ id: -42, type: 'group' })).resolves.toBe(
      false,
    );
  });

  it('denies channels and updates without a chat', async () => {
    const { access, users, chats } = setup({ users: true, chats: true });

    await expect(access.allows({ id: -100, type: 'channel' })).resolves.toBe(
      false,
    );
    await expect(access.allows(undefined)).resolves.toBe(false);
    expect(users.existsBy).not.toHaveBeenCalled();
    expect(chats.existsBy).not.toHaveBeenCalled();
  });
});
