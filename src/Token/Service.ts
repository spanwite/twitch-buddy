import type { Token, TokenRepository } from './Repository.ts';

export class TokenService {
	protected readonly tokenRepository: TokenRepository;

	constructor(ctx: { tokenRepository: TokenRepository }) {
		this.tokenRepository = ctx.tokenRepository;
	}

	renew(token: Token): void {
		const found = this.tokenRepository.findFirst();
		if (found) {
			this.tokenRepository.update({
				data: token,
				where: { token: found.token },
			});
		} else {
			this.tokenRepository.create({ data: token });
		}
	}

	find(): Token | null {
		return this.tokenRepository.findFirst();
	}
}
