import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Bot } from 'grammy';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/shared/app/app.module.js';
import { TelegramCommandsService } from '../src/features/telegram-commands/telegram-commands.service.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Bot)
      .useValue({
        isRunning: () => false,
        on: vi.fn(),
        api: { setMyCommands: vi.fn() },
      })
      .overrideProvider(TelegramCommandsService)
      .useValue({
        listCommands: vi.fn().mockResolvedValue([]),
        findTargets: vi.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET) is not served', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  it('/telegram/webhook (POST) rejects requests without the secret', () => {
    return request(app.getHttpServer())
      .post('/telegram/webhook')
      .send({ update_id: 1 })
      .expect(403);
  });

  afterEach(async () => {
    await app.close();
  });
});
