export enum AuthErrors {
  BadLogin = 1,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}

export interface IAuthUser {
  // #region Properties (3)

  error: AuthErrors | null;
  session: unknown | null;
  user: unknown | null;

  // #endregion Properties (3)
}

interface IPasswordResetError {
  error: {
    message: string;
    name: string;
    status?: number | undefined;
    stack?: string | undefined;
  };
  data: null;
}

interface IPasswordResetData {
  error: null;
  data: Record<never, never>;
}

export type IPasswordResetPayload = IPasswordResetError | IPasswordResetData;
