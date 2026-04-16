import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { User } from '../database/entities/user.entity';
import { UserRepository } from '../user/user.repository';

type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

const issuer = 'hopin-api';
const audience = 'hopin-client';


const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

const getRequiredSecret = (name: string): string => {
    const value = process.env[name];

    if (value) {
        return value;
    }

    throw new Error(`${name} must be configured`);
};

const ACCESS_TOKEN_SECRET = getRequiredSecret('JWT_ACCESS_SECRET');
const REFRESH_TOKEN_SECRET = getRequiredSecret('JWT_REFRESH_SECRET');

const ACCESS_SIGN_OPTIONS: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    issuer,
    audience,
};

const REFRESH_SIGN_OPTIONS: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
    issuer,
    audience,
};

export class AuthService {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
    }

    async register(name: string, email: string, password: string): Promise<User> {
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email is already in use');
        }

        const passwordHash = await bcrypt.hash(password, 12);
        return this.userRepository.create({
            name,
            email,
            passwordHash,
            experienceYears: null,
        });
    }

    async login(email: string, password: string): Promise<AuthTokens> {
        const user = await this.userRepository.findByEmailWithPassword(email);

        if (!user || !user.passwordHash) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        return this.issueAndPersistTokens(user);
    }

    async refresh(refreshToken: string): Promise<AuthTokens> {
        let payload: JwtPayload;

        try {
            payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, {
                issuer,
                audience,
            }) as JwtPayload;
        } catch (_error) {
            throw new Error('Invalid refresh token');
        }

        const userId = Number(payload.sub);
        if (!Number.isInteger(userId)) {
            throw new Error('Invalid refresh token subject');
        }

        const user = await this.userRepository.findByIdWithAuthFields(userId);
        if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
            throw new Error('Refresh token revoked');
        }

        if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
            throw new Error('Refresh token expired');
        }

        const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!matches) {
            throw new Error('Refresh token mismatch');
        }

        return this.issueAndPersistTokens(user);
    }

    async logout(userId: number): Promise<void> {
        await this.userRepository.clearRefreshToken(userId);
    }

    verifyAccessToken(token: string): JwtPayload {
        return jwt.verify(token, ACCESS_TOKEN_SECRET, {
            issuer,
            audience,
        }) as JwtPayload;
    }

    getRefreshCookieMaxAgeMs(): number {
        return REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    }

    private async issueAndPersistTokens(user: User): Promise<AuthTokens> {
        const accessToken = jwt.sign(
            { email: user.email ?? undefined },
            ACCESS_TOKEN_SECRET,
            {
                ...ACCESS_SIGN_OPTIONS,
                subject: String(user.id),
            },
        );

        const refreshToken = jwt.sign({}, REFRESH_TOKEN_SECRET, {
            ...REFRESH_SIGN_OPTIONS,
            subject: String(user.id),
        });

        const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
        const refreshTokenExpiresAt = new Date(Date.now() + this.getRefreshCookieMaxAgeMs());

        await this.userRepository.storeRefreshToken(user.id, refreshTokenHash, refreshTokenExpiresAt);

        return {
            accessToken,
            refreshToken,
        };
    }
}