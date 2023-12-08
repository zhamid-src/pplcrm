import { Injectable, signal } from "@angular/core";

import { from } from "rxjs";
import { TRPCService } from "./trpc.service.js";

interface IAuthUser {
  // #region Properties (3)

  error: AuthErrors | null;
  session: unknown | null;
  user: unknown | null;

  // #endregion Properties (3)
}

enum AuthErrors {
  BadLogin = 1,
  EmailNotConfirmed,
  InvalidRefreshToken,
  AdminTokenRequired,
  MissingInformation,
  UserAlreadyRegistered,
  BadPassword,
  Unknown,
}

@Injectable({
  providedIn: "root",
})
export class AuthService extends TRPCService {
  // #region Properties (1)

  private static _user = signal<unknown | null>(null);

  // #endregion Properties (1)

  // #region Public Static Accessors (1)

  public static get user() {
    return this._user;
  }

  // #endregion Public Static Accessors (1)

  // #region Public Methods (3)

  public signIn(input: { email: string; password: string }) {
    return this.api.auth.signIn
      .mutate(input)
      .then((payload: Partial<IAuthUser>) => {
        AuthService._user.set(payload?.user);
        return payload;
      })
      .catch(() => {
        AuthService._user.set(null);
        return { error: AuthErrors.BadLogin } as IAuthUser;
      });
  }

  public signOut() {
    return from(
      this.api.auth.signOut.mutate().finally(() => AuthService._user.set(null)),
    );
  }

  public signUp(input: { email: string; password: string }) {
    return this.api.auth.signUp
      .mutate(input)
      .then((payload: Partial<IAuthUser>) => {
        AuthService._user.set(payload?.user);
      })
      .catch(() => {
        AuthService._user.set(null);
        return { error: AuthErrors.BadLogin } as IAuthUser;
      });
  }

  // #endregion Public Methods (3)
}

/*
{
    "data": {
        "user": {
            "id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "zhamid@gmail.com",
            "email_confirmed_at": "2023-12-06T20:22:51.453502Z",
            "phone": "",
            "confirmed_at": "2023-12-06T20:22:51.453502Z",
            "last_sign_in_at": "2023-12-06T20:23:06.882337479Z",
            "app_metadata": {
                "provider": "email",
                "providers": [
                    "email"
                ]
            },
            "user_metadata": {},
            "identities": [
                {
                    "id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
                    "user_id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
                    "identity_data": {
                        "email": "zhamid@gmail.com",
                        "email_verified": false,
                        "phone_verified": false,
                        "sub": "86d2a7c7-d786-4008-a3ba-daf6502e05c1"
                    },
                    "provider": "email",
                    "last_sign_in_at": "2023-12-06T20:22:51.450819Z",
                    "created_at": "2023-12-06T20:22:51.450862Z",
                    "updated_at": "2023-12-06T20:22:51.450862Z"
                }
            ],
            "created_at": "2023-12-06T20:22:51.449412Z",
            "updated_at": "2023-12-06T20:23:06.884353Z"
        },
        "session": {
            "access_token": "eyJhbGciOiJIUzI1NiIsImtpZCI6IlpNNVBwRHZSVGxqMGs0VnQiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzAxODk3Nzg2LCJpYXQiOjE3MDE4OTQxODYsImlzcyI6Imh0dHBzOi8veWJ2cmV1ZHZzdml1Ym1hbHlhaGwuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6Ijg2ZDJhN2M3LWQ3ODYtNDAwOC1hM2JhLWRhZjY1MDJlMDVjMSIsImVtYWlsIjoiemhhbWlkQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzAxODk0MTg2fV0sInNlc3Npb25faWQiOiJlMmI0MGMzNi02YTY5LTRhMGQtYTlkMC0xZjE2NWNhOGFkMjgifQ.wKxs2LOXk_JDjObdhlMj5k6S_PDlA--kKFH9c190Pu4",
            "token_type": "bearer",
            "expires_in": 3600,
            "expires_at": 1701897786,
            "refresh_token": "zM4NzqHzArciVGVJJaf-MQ",
            "user": {
                "id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "zhamid@gmail.com",
                "email_confirmed_at": "2023-12-06T20:22:51.453502Z",
                "phone": "",
                "confirmed_at": "2023-12-06T20:22:51.453502Z",
                "last_sign_in_at": "2023-12-06T20:23:06.882337479Z",
                "app_metadata": {
                    "provider": "email",
                    "providers": [
                        "email"
                    ]
                },
                "user_metadata": {},
                "identities": [
                    {
                        "id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
                        "user_id": "86d2a7c7-d786-4008-a3ba-daf6502e05c1",
                        "identity_data": {
                            "email": "zhamid@gmail.com",
                            "email_verified": false,
                            "phone_verified": false,
                            "sub": "86d2a7c7-d786-4008-a3ba-daf6502e05c1"
                        },
                        "provider": "email",
                        "last_sign_in_at": "2023-12-06T20:22:51.450819Z",
                        "created_at": "2023-12-06T20:22:51.450862Z",
                        "updated_at": "2023-12-06T20:22:51.450862Z"
                    }
                ],
                "created_at": "2023-12-06T20:22:51.449412Z",
                "updated_at": "2023-12-06T20:23:06.884353Z"
            }
        }
    },
    "error": null
}
*/

/*

{
    "name": "AuthApiError",
    "message": "Invalid login credentials",
    "status": 400
}

*/

/*

{
    "name": "AuthApiError",
    "message": "Email not confirmed",
    "status": 400
}

*/
