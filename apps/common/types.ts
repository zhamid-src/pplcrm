export interface IAuthUser {
  user: any;
  session: any;
  error: AuthErrors | null;
}

export enum AuthErrors {
  BadLogin,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}
