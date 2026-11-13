import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { OwnerSnapshot } from './owner-snapshot.js';
import { OwnerService } from './owner.service.js';

@Controller('owners')
export class OwnerController {
  constructor(private readonly owners: OwnerService) {}

  @Get(':ownerId/snapshot')
  getSnapshot(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
  ): Promise<OwnerSnapshot> {
    return this.owners.getSnapshot(ownerId);
  }
}
