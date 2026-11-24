import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend web application
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe for type-safety and DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Lagos Life Purchasing Platform API')
    .setDescription(
      'Core REST API for Lagos Life in-game virtual currency purchasing and manual bank transfer verification',
    )
    .setVersion('1.0.0')
    .addTag('Packages & Pricing')
    .addTag('Orders & Checkout')
    .addTag('Admin Console')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[API Service] Lagos Life Platform API running on port ${port}`);
  console.log(`[Swagger Docs] Available at http://localhost:${port}/api/docs`);
}
bootstrap();
