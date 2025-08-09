import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Folder { id: string; name: string }
interface Email { id: string; subject: string; body: string }

/** Service for interacting with email backend */
@Injectable({ providedIn: 'root' })
export class EmailsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/emails`;

  getFolders() {
    return this.http.get<Folder[]>(`${this.base}/folders`);
  }

  getEmails(folderId: string) {
    return this.http.get<Email[]>(`${this.base}/folder/${folderId}`);
  }

  getEmail(id: string) {
    return this.http.get<{ email: Email; comments: any[] }>(`${this.base}/message/${id}`);
  }

  addComment(id: string, author_id: string, comment: string) {
    return this.http.post(`${this.base}/message/${id}/comment`, { author_id, comment });
  }

  assign(id: string, user_id: string) {
    return this.http.post(`${this.base}/message/${id}/assign`, { user_id });
  }
}
