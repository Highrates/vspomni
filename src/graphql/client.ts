/**
 * Legacy Saleor GraphQL client — disabled.
 * Витрина использует Nest `/api/v1` (`src/api/*`).
 * Любой вызов `graphqlRequest` бросает, чтобы не задеть прод GraphQL.
 */
import { getEmailConfirmationRedirectUrl } from '@/lib/siteUrl'

export const CHANNEL = 'vspomni-site'
export const RedirectUrl = getEmailConfirmationRedirectUrl()

export class LegacyGraphQLDisabledError extends Error {
  constructor() {
    super(
      'Saleor GraphQL is disabled: use the Nest API (src/api/*, /api/v1).',
    )
    this.name = 'LegacyGraphQLDisabledError'
  }
}

export async function graphqlRequest<T>(
  _query?: string,
  _variables?: Record<string, unknown>,
  _options?: { token?: string | null },
): Promise<T> {
  throw new LegacyGraphQLDisabledError()
}
