import { DataSource } from 'typeorm';
import { entitiesGlob, postgresOptions } from './database.options.js';

export default new DataSource({
  ...postgresOptions(),
  entities: [entitiesGlob],
});
