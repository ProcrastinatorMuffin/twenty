import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import crypto from 'crypto';

import { addMilliseconds, differenceInMilliseconds, isFuture } from 'date-fns';
import ms from 'ms';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { render } from '@react-email/render';
import { PasswordResetLinkEmail } from 'twenty-emails';

import {
  JwtAuthStrategy,
  JwtPayload,
} from 'src/engine/modules/auth/strategies/jwt.auth.strategy';
import { assert } from 'src/utils/assert';
import {
  ApiKeyToken,
  AuthToken,
  AuthTokens,
  PasswordResetToken,
} from 'src/engine/modules/auth/dto/token.entity';
import { EnvironmentService } from 'src/integrations/environment/environment.service';
import { User } from 'src/engine/modules/user/user.entity';
import { RefreshToken } from 'src/engine/modules/refresh-token/refresh-token.entity';
import { ValidatePasswordResetToken } from 'src/engine/modules/auth/dto/validate-password-reset-token.entity';
import { EmailService } from 'src/integrations/email/email.service';
import { InvalidatePassword } from 'src/engine/modules/auth/dto/invalidate-password.entity';
import { EmailPasswordResetLink } from 'src/engine/modules/auth/dto/email-password-reset-link.entity';
import { JwtData } from 'src/engine/modules/auth/types/jwt-data.type';
import { UserWorkspaceService } from 'src/engine/modules/user-workspace/user-workspace.service';
import { Workspace } from 'src/engine/modules/workspace/workspace.entity';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtAuthStrategy,
    private readonly environmentService: EnvironmentService,
    @InjectRepository(User, 'core')
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken, 'core')
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly emailService: EmailService,
    private readonly userWorkspaceService: UserWorkspaceService,
  ) {}

  async generateAccessToken(
    userId: string,
    workspaceId?: string,
  ): Promise<AuthToken> {
    const expiresIn = this.environmentService.get('ACCESS_TOKEN_EXPIRES_IN');

    assert(expiresIn, '', InternalServerErrorException);
    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['defaultWorkspace'],
    });

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    if (!user.defaultWorkspace) {
      throw new NotFoundException('User does not have a default workspace');
    }

    const jwtPayload: JwtPayload = {
      sub: user.id,
      workspaceId: workspaceId ? workspaceId : user.defaultWorkspace.id,
    };

    return {
      token: this.jwtService.sign(jwtPayload),
      expiresAt,
    };
  }

  async generateRefreshToken(userId: string): Promise<AuthToken> {
    const secret = this.environmentService.get('REFRESH_TOKEN_SECRET');
    const expiresIn = this.environmentService.get('REFRESH_TOKEN_EXPIRES_IN');

    assert(expiresIn, '', InternalServerErrorException);
    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

    const refreshTokenPayload = {
      userId,
      expiresAt,
    };
    const jwtPayload = {
      sub: userId,
    };

    const refreshToken =
      this.refreshTokenRepository.create(refreshTokenPayload);

    await this.refreshTokenRepository.save(refreshToken);

    return {
      token: this.jwtService.sign(jwtPayload, {
        secret,
        expiresIn,
        // Jwtid will be used to link RefreshToken entity to this token
        jwtid: refreshToken.id,
      }),
      expiresAt,
    };
  }

  async generateLoginToken(email: string): Promise<AuthToken> {
    const secret = this.environmentService.get('LOGIN_TOKEN_SECRET');
    const expiresIn = this.environmentService.get('LOGIN_TOKEN_EXPIRES_IN');

    assert(expiresIn, '', InternalServerErrorException);
    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));
    const jwtPayload = {
      sub: email,
    };

    return {
      token: this.jwtService.sign(jwtPayload, {
        secret,
        expiresIn,
      }),
      expiresAt,
    };
  }

  async generateTransientToken(
    workspaceMemberId: string,
    workspaceId: string,
  ): Promise<AuthToken> {
    const secret = this.environmentService.get('LOGIN_TOKEN_SECRET');
    const expiresIn = this.environmentService.get(
      'SHORT_TERM_TOKEN_EXPIRES_IN',
    );

    assert(expiresIn, '', InternalServerErrorException);
    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));
    const jwtPayload = {
      sub: workspaceMemberId,
      workspaceId,
    };

    return {
      token: this.jwtService.sign(jwtPayload, {
        secret,
        expiresIn,
      }),
      expiresAt,
    };
  }

  async generateApiKeyToken(
    workspaceId: string,
    apiKeyId?: string,
    expiresAt?: Date | string,
  ): Promise<Pick<ApiKeyToken, 'token'> | undefined> {
    if (!apiKeyId) {
      return;
    }
    const jwtPayload = {
      sub: workspaceId,
    };
    const secret = this.environmentService.get('ACCESS_TOKEN_SECRET');
    let expiresIn: string | number;

    if (expiresAt) {
      expiresIn = Math.floor(
        (new Date(expiresAt).getTime() - new Date().getTime()) / 1000,
      );
    } else {
      expiresIn = this.environmentService.get('API_TOKEN_EXPIRES_IN');
    }
    const token = this.jwtService.sign(jwtPayload, {
      secret,
      expiresIn,
      jwtid: apiKeyId,
    });

    return { token };
  }

  isTokenPresent(request: Request): boolean {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    return !!token;
  }

  async validateToken(request: Request): Promise<JwtData> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException('missing authentication token');
    }
    const decoded = await this.verifyJwt(
      token,
      this.environmentService.get('ACCESS_TOKEN_SECRET'),
    );

    const { user, workspace } = await this.jwtStrategy.validate(
      decoded as JwtPayload,
    );

    return { user, workspace };
  }

  async verifyLoginToken(loginToken: string): Promise<string> {
    const loginTokenSecret = this.environmentService.get('LOGIN_TOKEN_SECRET');

    const payload = await this.verifyJwt(loginToken, loginTokenSecret);

    return payload.sub;
  }

  async verifyTransientToken(transientToken: string): Promise<{
    workspaceMemberId: string;
    workspaceId: string;
  }> {
    const transientTokenSecret =
      this.environmentService.get('LOGIN_TOKEN_SECRET');

    const payload = await this.verifyJwt(transientToken, transientTokenSecret);

    return {
      workspaceMemberId: payload.sub,
      workspaceId: payload.workspaceId,
    };
  }

  async generateSwitchWorkspaceToken(
    user: User,
    workspaceId: string,
  ): Promise<AuthTokens> {
    const userExists = await this.userRepository.findBy({ id: user.id });

    assert(userExists, 'User not found', NotFoundException);

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['workspaceUsers'],
    });

    assert(workspace, 'workspace doesnt exist', NotFoundException);

    assert(
      workspace.workspaceUsers
        .map((userWorkspace) => userWorkspace.userId)
        .includes(user.id),
      'user does not belong to workspace',
      ForbiddenException,
    );

    await this.userRepository.save({
      id: user.id,
      defaultWorkspace: workspace,
    });

    const token = await this.generateAccessToken(user.id, workspaceId);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      tokens: {
        accessToken: token,
        refreshToken,
      },
    };
  }

  async verifyRefreshToken(refreshToken: string) {
    const secret = this.environmentService.get('REFRESH_TOKEN_SECRET');
    const coolDown = this.environmentService.get('REFRESH_TOKEN_COOL_DOWN');
    const jwtPayload = await this.verifyJwt(refreshToken, secret);

    assert(
      jwtPayload.jti && jwtPayload.sub,
      'This refresh token is malformed',
      UnprocessableEntityException,
    );

    const token = await this.refreshTokenRepository.findOneBy({
      id: jwtPayload.jti,
    });

    assert(token, "This refresh token doesn't exist", NotFoundException);

    const user = await this.userRepository.findOneBy({
      id: jwtPayload.sub,
    });

    assert(user, 'User not found', NotFoundException);

    // Check if revokedAt is less than coolDown
    if (
      token.revokedAt &&
      token.revokedAt.getTime() <= Date.now() - ms(coolDown)
    ) {
      // Revoke all user refresh tokens
      await Promise.all(
        user.refreshTokens.map(
          async ({ id }) =>
            await this.refreshTokenRepository.update(
              { id },
              {
                revokedAt: new Date(),
              },
            ),
        ),
      );

      throw new ForbiddenException(
        'Suspicious activity detected, this refresh token has been revoked. All tokens has been revoked.',
      );
    }

    return { user, token };
  }

  async generateTokensFromRefreshToken(token: string): Promise<{
    accessToken: AuthToken;
    refreshToken: AuthToken;
  }> {
    const {
      user,
      token: { id },
    } = await this.verifyRefreshToken(token);

    // Revoke old refresh token
    await this.refreshTokenRepository.update(
      {
        id,
      },
      {
        revokedAt: new Date(),
      },
    );

    const accessToken = await this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }

  computeRedirectURI(loginToken: string): string {
    return `${this.environmentService.getFrontAuthCallbackUrl()}?loginToken=${loginToken}`;
  }

  async verifyJwt(token: string, secret?: string) {
    try {
      return this.jwtService.verify(token, secret ? { secret } : undefined);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired.');
      } else if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Token invalid.');
      } else {
        throw new UnprocessableEntityException();
      }
    }
  }

  async generatePasswordResetToken(email: string): Promise<PasswordResetToken> {
    const user = await this.userRepository.findOneBy({
      email,
    });

    assert(user, 'User not found', NotFoundException);

    const expiresIn = this.environmentService.get(
      'PASSWORD_RESET_TOKEN_EXPIRES_IN',
    );

    assert(
      expiresIn,
      'PASSWORD_RESET_TOKEN_EXPIRES_IN constant value not found',
      InternalServerErrorException,
    );

    if (
      user.passwordResetToken &&
      user.passwordResetTokenExpiresAt &&
      isFuture(user.passwordResetTokenExpiresAt)
    ) {
      assert(
        false,
        `Token has been already generated. Please wait for ${ms(
          differenceInMilliseconds(
            user.passwordResetTokenExpiresAt,
            new Date(),
          ),
          {
            long: true,
          },
        )} to generate again.`,
        BadRequestException,
      );
    }

    const plainResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(plainResetToken)
      .digest('hex');

    const expiresAt = addMilliseconds(new Date().getTime(), ms(expiresIn));

    await this.userRepository.update(user.id, {
      passwordResetToken: hashedResetToken,
      passwordResetTokenExpiresAt: expiresAt,
    });

    return {
      passwordResetToken: plainResetToken,
      passwordResetTokenExpiresAt: expiresAt,
    };
  }

  async sendEmailPasswordResetLink(
    resetToken: PasswordResetToken,
    email: string,
  ): Promise<EmailPasswordResetLink> {
    const user = await this.userRepository.findOneBy({
      email,
    });

    assert(user, 'User not found', NotFoundException);

    const frontBaseURL = this.environmentService.get('FRONT_BASE_URL');
    const resetLink = `${frontBaseURL}/reset-password/${resetToken.passwordResetToken}`;

    const emailData = {
      link: resetLink,
      duration: ms(
        differenceInMilliseconds(
          resetToken.passwordResetTokenExpiresAt,
          new Date(),
        ),
        {
          long: true,
        },
      ),
    };

    const emailTemplate = PasswordResetLinkEmail(emailData);
    const html = render(emailTemplate, {
      pretty: true,
    });

    const text = render(emailTemplate, {
      plainText: true,
    });

    this.emailService.send({
      from: `${this.environmentService.get(
        'EMAIL_FROM_NAME',
      )} <${this.environmentService.get('EMAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: 'Action Needed to Reset Password',
      text,
      html,
    });

    return { success: true };
  }

  async validatePasswordResetToken(
    resetToken: string,
  ): Promise<ValidatePasswordResetToken> {
    const hashedResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await this.userRepository.findOneBy({
      passwordResetToken: hashedResetToken,
    });

    assert(user, 'Token is invalid', NotFoundException);

    const tokenExpiresAt = user.passwordResetTokenExpiresAt;

    assert(
      tokenExpiresAt && isFuture(tokenExpiresAt),
      'Token has expired. Please regenerate',
      NotFoundException,
    );

    return {
      id: user.id,
      email: user.email,
    };
  }

  async invalidatePasswordResetToken(
    userId: string,
  ): Promise<InvalidatePassword> {
    const user = await this.userRepository.findOneBy({
      id: userId,
    });

    assert(user, 'User not found', NotFoundException);

    await this.userRepository.update(user.id, {
      passwordResetToken: '',
      passwordResetTokenExpiresAt: undefined,
    });

    return { success: true };
  }
}
