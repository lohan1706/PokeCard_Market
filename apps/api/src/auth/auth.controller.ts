import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthCookieWriter } from './auth-cookie.writer';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';
import { readCookie } from './cookies';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieWriter,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Compte collectionneur créé' })
  async register(@Body() dto: RegisterDto): Promise<{ user: AuthenticatedUser }> {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Session ouverte' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const userAgent = request.get('user-agent');
    const result = await this.authService.login(dto.email, dto.password, {
      userAgent: userAgent ? userAgent.slice(0, 255) : undefined,
      ip: request.ip ? request.ip.slice(0, 64) : undefined,
    });
    this.cookies.attach(response, result.token);
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(readCookie(request.headers.cookie, SESSION_COOKIE_NAME));
    this.cookies.clear(response);
  }

  @Get('me')
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiOkResponse({ description: 'Utilisateur courant' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
