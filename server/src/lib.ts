import type { AppClient, StatusAPIResponse } from '@farcaster/auth-client'

export const validateFarcasterSignature = async (
  farcasterClient: AppClient,
  domain: string,
  statusAPIResponse: StatusAPIResponse
): Promise<boolean> => {
  if (
    !domain ||
    !statusAPIResponse ||
    !statusAPIResponse.message ||
    !statusAPIResponse.signature ||
    !statusAPIResponse.nonce
  ) {
    return false
  }

  const { verifySignInMessage } = farcasterClient
  try {
    const result = await verifySignInMessage({
      message: statusAPIResponse.message,
      signature: statusAPIResponse.signature,
      domain,
      nonce: statusAPIResponse.nonce,
    })

    return result && result.success
  } catch (error) {
    console.error(error)
    return false
  }
}
