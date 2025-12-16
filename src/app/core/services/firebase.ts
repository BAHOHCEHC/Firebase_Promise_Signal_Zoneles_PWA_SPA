import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environments';

interface SignInResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

interface FirebaseError {
  error: {
    message: string;
    code: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class Firebase {
  private readonly apiKey = environment.firebase.apiKey;
  private readonly authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.apiKey}`;

  async signInWithEmailAndPassword(email: string, password: string): Promise<SignInResponse> {
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as FirebaseError;
      let message = 'Ошибка входа';

      if (error.error) {
        switch (error.error.message) {
          case 'EMAIL_NOT_FOUND':
            message = 'Пользователь с таким email не найден';
            break;
          case 'INVALID_PASSWORD':
            message = 'Неверный пароль';
            break;
          case 'USER_DISABLED':
            message = 'Пользователь заблокирован';
            break;
          case 'INVALID_EMAIL':
            message = 'Неверный формат email';
            break;
          default:
            message = error.error.message || 'Ошибка входа';
        }
      }

      throw new Error(message);
    }

    return data as SignInResponse;
  }
}
