import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const path = request.path || request.url.split('?')[0] || '/';
    const name = exception instanceof Error ? exception.name : 'UnknownError';
    this.logger.warn(`${request.method} ${path} ${status} ${name}`);

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      response
        .status(status)
        .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    response.status(status).json({
      statusCode: status,
      message: 'Erreur interne',
    });
  }
}
