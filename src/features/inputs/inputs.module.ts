import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Input } from './input.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Input])],
  exports: [TypeOrmModule],
})
export class InputsModule {}
