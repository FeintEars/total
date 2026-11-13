import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Input } from './input.entity.js';
import { InputsService } from './inputs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Input])],
  providers: [InputsService],
  exports: [TypeOrmModule, InputsService],
})
export class InputsModule {}
