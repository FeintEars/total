import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Input } from './input.entity.js';

@Injectable()
export class InputsService {
  constructor(
    @InjectRepository(Input)
    private readonly inputs: Repository<Input>,
  ) {}

  findByOwner(ownerId: string): Promise<Input[]> {
    return this.inputs.find({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });
  }
}
