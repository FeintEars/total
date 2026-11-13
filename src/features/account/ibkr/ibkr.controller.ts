import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { IbkrAccountSnapshot } from './ibkr-account-snapshot.js';
import { IbkrService } from './ibkr.service.js';

@Controller('ibkr')
export class IbkrController {
  constructor(private readonly ibkr: IbkrService) {}

  @Get(':accountId/snapshot')
  getSnapshot(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<IbkrAccountSnapshot> {
    return this.ibkr.getAccountSnapshot(accountId);
  }
}
