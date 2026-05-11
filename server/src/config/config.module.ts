import { Module, Global } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: {
        jwtSecret: process.env.JWT_SECRET || 'default-secret',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    },
  ],
  exports: ['CONFIG'],
})
export class ConfigModule {}
