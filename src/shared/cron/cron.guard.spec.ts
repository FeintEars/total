import { CronGuard } from './cron.guard.js';

function context(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) =>
          name === 'authorization' ? authorization : undefined,
      }),
    }),
  };
}

describe('CronGuard', () => {
  it('accepts the bearer secret', () => {
    const guard = new CronGuard({ secret: 's3cret' });

    expect(guard.canActivate(context('Bearer s3cret') as never)).toBe(true);
  });

  it('rejects a wrong or missing secret', () => {
    const guard = new CronGuard({ secret: 's3cret' });

    expect(guard.canActivate(context('Bearer nope') as never)).toBe(false);
    expect(guard.canActivate(context('s3cret') as never)).toBe(false);
    expect(guard.canActivate(context() as never)).toBe(false);
  });

  it('rejects everything while the secret is not set', () => {
    const guard = new CronGuard({ secret: '' });

    expect(guard.canActivate(context('Bearer ') as never)).toBe(false);
  });
});
