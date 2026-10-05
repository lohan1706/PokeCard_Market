import { ArgumentsHost, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from '../../src/auth/http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('logs the route status without the exception message', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const json = jest.fn();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          method: 'POST',
          path: '/api/v1/auth/login',
          url: '/api/v1/auth/login?password=SuperSecret1',
        }),
      }),
    } as unknown as ArgumentsHost;
    const filter = new HttpExceptionFilter();

    filter.catch(new Error('password=SuperSecret1'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erreur interne',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('SuperSecret1');
    expect(warn).toHaveBeenCalledWith('POST /api/v1/auth/login 500 Error');

    filter.catch(new UnauthorizedException('Identifiants invalides'), host);
    expect(json).toHaveBeenLastCalledWith({
      statusCode: 401,
      message: 'Identifiants invalides',
      error: 'Unauthorized',
    });

    warn.mockRestore();
  });
});
