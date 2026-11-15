import { TelegramAccessService } from './telegram-access.service.js';

function setup(allowed = false) {
  const chats = { existsBy: vi.fn().mockResolvedValue(allowed) };
  return { chats, access: new TelegramAccessService(chats as never) };
}

describe('TelegramAccessService.allows', () => {
  it('checks a private chat against the allowed chats', async () => {
    const { access, chats } = setup(true);

    await expect(
      access.allows({ id: 123456789, type: 'private' }),
    ).resolves.toBe(true);
    expect(chats.existsBy).toHaveBeenCalledWith({ chatId: '123456789' });
  });

  it('checks a group against the allowed chats', async () => {
    const { access, chats } = setup(true);

    await expect(
      access.allows({ id: -1001234567890, type: 'supergroup' }),
    ).resolves.toBe(true);
    expect(chats.existsBy).toHaveBeenCalledWith({ chatId: '-1001234567890' });
  });

  it('denies a chat missing from the table', async () => {
    const { access } = setup();

    await expect(access.allows({ id: 42, type: 'private' })).resolves.toBe(
      false,
    );
    await expect(access.allows({ id: -42, type: 'group' })).resolves.toBe(
      false,
    );
  });

  it('denies channels and updates without a chat', async () => {
    const { access, chats } = setup(true);

    await expect(access.allows({ id: -100, type: 'channel' })).resolves.toBe(
      false,
    );
    await expect(access.allows(undefined)).resolves.toBe(false);
    expect(chats.existsBy).not.toHaveBeenCalled();
  });
});
