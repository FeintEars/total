import { registerAs } from '@nestjs/config';

export default registerAs('polymarket', () => ({
  polygonRpcUrl:
    process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
}));
