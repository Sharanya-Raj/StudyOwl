import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { loginRequest } from './authConfig'

export async function getAccessToken(instance, account) {
  if (!instance || !account) {
    throw new Error('Missing authentication context')
  }

  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    })
    return response.accessToken
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({
        ...loginRequest,
        account,
      })
      return null
    }
    throw error
  }
}
