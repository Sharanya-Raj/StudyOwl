const tenantName = import.meta.env.VITE_AAD_B2C_TENANT_NAME
const tenantDomain = import.meta.env.VITE_AAD_B2C_TENANT_DOMAIN || (tenantName ? `${tenantName}.onmicrosoft.com` : '')
const clientId = import.meta.env.VITE_AAD_B2C_CLIENT_ID
const signInPolicy = import.meta.env.VITE_AAD_B2C_SIGNIN_POLICY
const signUpPolicy = import.meta.env.VITE_AAD_B2C_SIGNUP_POLICY || signInPolicy

const knownAuthorities = tenantName ? [`${tenantName}.b2clogin.com`] : []
const authorityBase = tenantName && tenantDomain ? `https://${tenantName}.b2clogin.com/${tenantDomain}` : ''

export const authorities = {
  signIn: `${authorityBase}/${signInPolicy}`,
  signUp: `${authorityBase}/${signUpPolicy}`,
}

export const msalConfig = {
  auth: {
    clientId,
    authority: authorities.signIn,
    knownAuthorities,
    redirectUri: '/',
    postLogoutRedirectUri: '/',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
}

const rawScopes = import.meta.env.VITE_AAD_B2C_SCOPES || ''
const scopes = rawScopes
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean)

export const loginRequest = {
  scopes: scopes.length ? scopes : ['openid', 'profile', 'email'],
}
