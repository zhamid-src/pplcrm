export interface IToken {
  auth_token: string;
  refresh_token: string;
}

export interface IAuthUser {
  email: string;
  first_name: string;
  id: number;
}
