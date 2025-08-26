import * as bcrypt from 'bcrypt';

import { AuthController } from './controller';

describe('AuthController', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lowercases email before lookup', async () => {
    const controller = new AuthController();
    const hashed = bcrypt.hashSync('password123', 1);
    const user = { id: '1', tenant_id: 't1', password: hashed, first_name: 'Test' } as any;
    const getUserSpy = jest
      .spyOn(controller as any, 'getUserByEmail')
      .mockResolvedValue(user);
    jest
      .spyOn(controller as any, 'createTokens')
      .mockResolvedValue({ auth_token: 'a', refresh_token: 'r' });

    await controller.signIn({ email: 'User@Example.com', password: 'password123' });

    expect(getUserSpy).toHaveBeenCalledWith('user@example.com');
  });
});
