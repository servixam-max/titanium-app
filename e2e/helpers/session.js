// Helpers compartidos de los e2e.
//
// La app exige autenticación explícita (`isExplicitlyAuthenticated`): con solo
// sembrar el usuario, AuthModal tapa la pantalla y ningún clic llega. Aquí se
// siembra todo lo que la app consulta al arrancar.

const E2E_USER = {
  id: 'e2e-user-id',
  clientId: 'e2e',
  ownerUserId: 'e2e-user-id',
  username: 'E2E',
  email: 'e2e@fortixam.local',
  passwordHash: '',
  avatarColor: '#00D68F',
  createdAt: '2026-09-01T10:00:00.000Z',
  modifiedAt: '2026-09-01T10:00:00.000Z',
  lastLogin: '2026-09-01T10:00:00.000Z',
  version: 1,
  authProvider: 'local',
  serverUserId: 'e2e-user-id',
};

/**
 * Deja la app en estado "sesión iniciada" antes de navegar.
 * @param {import('@playwright/test').Page} page
 * @param {{ theme?: 'dark' | 'light' }} [options]
 */
async function seedSession(page, options = {}) {
  const { theme } = options;

  await page.addInitScript(
    ({ user, theme }) => {
      localStorage.setItem('fortixam_server_user', JSON.stringify(user));
      localStorage.setItem('fortixam_active_user_id', user.id);
      // Sin esto AuthModal se muestra encima de todo
      localStorage.setItem('fortixam_explicit_auth_v1', 'true');
      localStorage.setItem('fortixam_access_token', 'e2e-token');
      localStorage.setItem(
        'titanium-storage',
        JSON.stringify({
          state: { onboardingComplete: true, ...(theme ? { theme } : {}) },
          version: 0,
        })
      );
      if (theme) localStorage.setItem('fortixam-theme', theme);
    },
    { user: E2E_USER, theme: theme ?? null }
  );
}

module.exports = { E2E_USER, seedSession };
