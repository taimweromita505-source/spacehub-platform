// Only provider-verified identity data may reach the account lookup.
async function verifySocialIdentity(body, googleClientId) {
  if (body.provider === 'google') {
    if (!googleClientId) {
      return { status: 503, error: 'Google sign-in is unavailable. Use your SpaceHub password.' };
    }
    if (typeof body.idToken !== 'string' || !body.idToken.trim()) {
      return { status: 400, error: 'Please use the Google Sign-In button.' };
    }
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?' + new URLSearchParams({ id_token: body.idToken.trim() }));
    if (!response.ok) return { status: 401, error: 'Invalid Google ID token.' };

    const info = await response.json();
    const email = String(info.email || '').toLowerCase();
    if (info.aud !== googleClientId ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) ||
        !(Number(info.exp) > Date.now() / 1000) ||
        typeof info.sub !== 'string' || !info.sub ||
        !email || ![true, 'true'].includes(info.email_verified)) {
      return { status: 401, error: 'Google account verification failed.' };
    }
    // Google is authoritative for Gmail and managed Workspace addresses.
    const trustedEmail = email.endsWith('@gmail.com') || info.hd ? email : '';
    return {
      provider: 'google',
      subject: info.sub,
      email: trustedEmail,
      legacyEmail: email,
      username: email.split('@')[0],
      displayName: info.name
    };
  }

  if (body.provider === 'github') {
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    if (!accessToken) return { status: 400, error: 'A GitHub token is required to verify your account.' };

    const headers = {
      Authorization: 'Bearer ' + accessToken,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SpaceHub-Platform'
    };
    const response = await fetch('https://api.github.com/user', { headers });
    if (!response.ok) return { status: 401, error: 'Invalid GitHub token.' };

    const info = await response.json();
    if (!Number.isSafeInteger(info.id) || info.id <= 0 || !info.login) {
      return { status: 401, error: 'GitHub account verification failed.' };
    }
    let email = '';
    if (info.email) {
      // The profile field alone does not establish email ownership.
      const emails = await fetch('https://api.github.com/user/public_emails', { headers });
      if (emails.ok) {
        const addresses = await emails.json();
        const publicEmail = String(info.email).toLowerCase();
        if (Array.isArray(addresses) && addresses.some((address) =>
          address.verified === true && address.email?.toLowerCase() === publicEmail
        )) email = publicEmail;
      }
    }
    return {
      provider: 'github',
      subject: String(info.id),
      email,
      legacyEmail: String(info.email || `${info.login}@users.noreply.github.com`).toLowerCase(),
      username: info.login.toLowerCase(),
      displayName: info.name || info.login,
      accessToken
    };
  }

  return { status: 400, error: 'This social sign-in provider is unavailable. Use your SpaceHub password.' };
}

function findSocialUser(users, { provider, subject, email }) {
  const linkedUser = users.find((user) => user.socialProvider === provider && user.socialSubject === subject);
  if (linkedUser) return linkedUser;
  if (!email) return undefined;

  // Existing social accounts can be linked once through an exact provider and email match.
  const legacyMatches = users.filter((user) =>
    user.socialProvider === provider && !user.socialSubject && user.email?.toLowerCase() === email
  );
  return legacyMatches.length === 1 ? legacyMatches[0] : undefined;
}

function needsExistingAccountRecovery(users, { provider, email, legacyEmail }) {
  return users.some((user) => {
    const address = user.email?.toLowerCase();
    return address && (address === email ||
      (address === legacyEmail && user.socialProvider === provider && !user.socialSubject));
  });
}

module.exports = { verifySocialIdentity, findSocialUser, needsExistingAccountRecovery };
