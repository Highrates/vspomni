import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PRIVACY_CONSENT_VERSION } from './consent-versions';

type YandexStatePayload = {
  purpose: 'yandex_oauth';
  typ: 'yandex_state';
  next?: string;
  guestId?: string;
};

type YandexTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type YandexUserInfo = {
  id?: string;
  login?: string;
  default_email?: string;
  emails?: string[];
  real_name?: string;
  first_name?: string;
  last_name?: string;
  default_phone?: { number?: string };
};

@Injectable()
export class YandexOauthService {
  private readonly logger = new Logger(YandexOauthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId() && this.clientSecret() && this.redirectUri());
  }

  status() {
    return { enabled: this.isConfigured() };
  }

  start(input?: { next?: string | null; guestId?: string | null }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Вход через Яндекс ID не настроен (YANDEX_OAUTH_CLIENT_ID / SECRET)',
      );
    }
    const next = this.safeNext(input?.next);
    const guestId = input?.guestId?.trim() || undefined;
    const state = this.jwt.sign(
      {
        purpose: 'yandex_oauth',
        typ: 'yandex_state',
        ...(next ? { next } : {}),
        ...(guestId ? { guestId } : {}),
      } satisfies YandexStatePayload,
      { expiresIn: '10m' },
    );
    const url = new URL('https://oauth.yandex.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId());
    url.searchParams.set('redirect_uri', this.redirectUri());
    url.searchParams.set('scope', 'login:email login:info login:default_phone');
    url.searchParams.set('force_confirm', 'yes');
    url.searchParams.set('state', state);
    return { url: url.toString(), state };
  }

  async complete(input: {
    code: string;
    state: string;
    guestId?: string | null;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Вход через Яндекс ID не настроен',
      );
    }
    const code = input.code?.trim();
    const stateRaw = input.state?.trim();
    if (!code || !stateRaw) {
      throw new BadRequestException('Нет code/state от Яндекса');
    }
    const state = this.verifyState(stateRaw);
    const yandexToken = await this.exchangeCode(code);
    const info = await this.fetchUserInfo(yandexToken);
    const yandexId = String(info.id || '').trim();
    if (!yandexId) {
      throw new BadRequestException('Яндекс не вернул id пользователя');
    }
    const email = this.pickEmail(info);
    if (!email) {
      throw new BadRequestException(
        'У аккаунта Яндекса нет email — укажите почту в Яндекс ID и повторите',
      );
    }
    const displayName =
      info.real_name?.trim() ||
      [info.first_name, info.last_name].filter(Boolean).join(' ').trim() ||
      info.login?.trim() ||
      null;
    const phone = info.default_phone?.number?.trim() || null;

    const user = await this.upsertBuyer({
      yandexId,
      email,
      displayName,
      phone,
    });
    const guestId = input.guestId?.trim() || state.guestId || null;
    await this.auth.claimGuestOrders(user.id, guestId, user.email);
    const tokens = await this.auth.login(user);
    return {
      ...tokens,
      next: state.next || '/',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  private clientId(): string {
    return (this.config.get<string>('YANDEX_OAUTH_CLIENT_ID') ?? '').trim();
  }

  private clientSecret(): string {
    return (this.config.get<string>('YANDEX_OAUTH_CLIENT_SECRET') ?? '').trim();
  }

  private redirectUri(): string {
    const explicit = (
      this.config.get<string>('YANDEX_OAUTH_REDIRECT_URI') ?? ''
    ).trim();
    if (explicit) return explicit;
    const site = (
      this.config.get<string>('FRONTEND_PUBLIC_URL') ?? ''
    )
      .trim()
      .replace(/\/+$/, '');
    return site ? `${site}/login` : '';
  }

  private safeNext(raw?: string | null): string | undefined {
    const n = (raw ?? '').trim();
    if (!n || !n.startsWith('/') || n.startsWith('//')) return undefined;
    if (n.startsWith('/login')) return '/';
    return n.slice(0, 500);
  }

  private verifyState(state: string): YandexStatePayload {
    try {
      const payload = this.jwt.verify<YandexStatePayload>(state);
      if (
        payload.purpose !== 'yandex_oauth' ||
        payload.typ !== 'yandex_state'
      ) {
        throw new Error('bad purpose');
      }
      return payload;
    } catch {
      throw new BadRequestException('Сессия Яндекс ID истекла — попробуйте снова');
    }
  }

  private async exchangeCode(code: string): Promise<string> {
    const clientId = this.clientId();
    const clientSecret = this.clientSecret();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
    });
    const res = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body,
    });
    const json = (await res.json()) as YandexTokenResponse;
    if (!res.ok || !json.access_token) {
      this.logger.warn(
        `Yandex token exchange failed: ${json.error || res.status} ${json.error_description || ''}`,
      );
      throw new BadRequestException(
        'Не удалось подтвердить вход через Яндекс — попробуйте снова',
      );
    }
    return json.access_token;
  }

  private async fetchUserInfo(accessToken: string): Promise<YandexUserInfo> {
    const res = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!res.ok) {
      throw new BadRequestException('Не удалось получить профиль Яндекс ID');
    }
    return (await res.json()) as YandexUserInfo;
  }

  private pickEmail(info: YandexUserInfo): string | null {
    const raw =
      info.default_email?.trim() ||
      info.emails?.find((e) => e?.trim())?.trim() ||
      '';
    return raw ? raw.toLowerCase() : null;
  }

  private async upsertBuyer(input: {
    yandexId: string;
    email: string;
    displayName: string | null;
    phone: string | null;
  }) {
    const now = new Date();
    const byYandex = await this.prisma.user.findUnique({
      where: { yandexId: input.yandexId },
    });
    if (byYandex) {
      if (!byYandex.isActive || byYandex.role !== UserRole.USER) {
        throw new BadRequestException('Аккаунт недоступен');
      }
      return this.prisma.user.update({
        where: { id: byYandex.id },
        data: {
          email: input.email,
          displayName: input.displayName || byYandex.displayName,
          phone: input.phone || byYandex.phone,
        },
        select: {
          id: true,
          email: true,
          role: true,
          displayName: true,
          tokenVersion: true,
        },
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (byEmail) {
      if (!byEmail.isActive || byEmail.role !== UserRole.USER) {
        throw new BadRequestException('Аккаунт недоступен');
      }
      if (byEmail.yandexId && byEmail.yandexId !== input.yandexId) {
        throw new BadRequestException(
          'Этот email уже привязан к другому Яндекс-аккаунту',
        );
      }
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          yandexId: input.yandexId,
          displayName: input.displayName || byEmail.displayName,
          phone: input.phone || byEmail.phone,
          privacyConsentAt: byEmail.privacyConsentAt ?? now,
          privacyConsentVersion:
            byEmail.privacyConsentVersion ?? PRIVACY_CONSENT_VERSION,
        },
        select: {
          id: true,
          email: true,
          role: true,
          displayName: true,
          tokenVersion: true,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: input.email,
        yandexId: input.yandexId,
        role: UserRole.USER,
        displayName: input.displayName,
        phone: input.phone,
        passwordHash: null,
        privacyConsentAt: now,
        privacyConsentVersion: PRIVACY_CONSENT_VERSION,
        marketingConsent: false,
        marketingConsentVersion: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        tokenVersion: true,
      },
    });
  }
}
