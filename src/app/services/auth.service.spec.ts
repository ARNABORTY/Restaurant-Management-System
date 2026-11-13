import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.removeItem('goody-foody-demo-role');
  });

  it('accepts demo credentials and persists only the staff role', () => {
    const auth = new AuthService();

    expect(auth.login('ADMIN@GOODYFOODY.IN', 'Royal@2026')).toBe('manager');
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.getCurrentRole()).toBe('manager');
    expect(localStorage.getItem('goody-foody-demo-role')).toBe('manager');
    expect(localStorage.getItem('goody-foody-demo-role')).not.toContain('Royal@2026');

    const restoredAuth = new AuthService();
    expect(restoredAuth.isLoggedIn()).toBe(true);
    expect(restoredAuth.getCurrentRole()).toBe('manager');
  });

  it('rejects invalid credentials and clears the session on logout', () => {
    const auth = new AuthService();

    expect(auth.login('admin@goodyfoody.in', 'wrong-password')).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);

    expect(auth.login('chef@goodyfoody.in', 'Chef@2026')).toBe('chef');
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('goody-foody-demo-role')).toBeNull();
  });
});
