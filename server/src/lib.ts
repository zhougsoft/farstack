import type { AppClient, StatusAPIResponse } from '@farcaster/auth-client'

export const validateFarcasterSignature = async (
  farcasterClient: AppClient,
  domain: string,
  statusAPIResponse: StatusAPIResponse
) => {
  return new Promise<boolean>(async resolve => {
    if (
      !domain ||
      !statusAPIResponse ||
      !statusAPIResponse.message ||
      !statusAPIResponse.signature ||
      !statusAPIResponse.nonce
    ) {
      return resolve(false)
    }

    const { verifySignInMessage } = farcasterClient
    const result = await verifySignInMessage({
      message: statusAPIResponse.message as string,
      signature: statusAPIResponse.signature as `0x${string}`,
      domain,
      nonce: statusAPIResponse.nonce,
    }).catch(() => resolve(false))

    resolve(result?.success ? true : false)
  })
}
