import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { environment } from '../../../../environments/environment';
import { TokenService } from '../../../services/api/token-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { FilesService } from '../services/files.service';

@Component({
  selector: 'pc-files-grid',
  imports: [DatePipe, Icon],
  templateUrl: './files-grid.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
      }
    `,
  ],
})
export class FilesGrid implements OnInit {
  private readonly filesSvc = inject(FilesService);
  private readonly alertSvc = inject(AlertService);
  private readonly tokenSvc = inject(TokenService);
  private readonly dialogs = inject(ConfirmDialogService);

  protected readonly files = signal<any[]>([]);
  protected readonly filteredFiles = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly searchQuery = signal('');

  public ngOnInit() {
    void this.loadFiles();
  }

  protected async onFileSelectedForUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    this.isUploading.set(true);
    try {
      await this.filesSvc.uploadFileDirectly(file);
      this.alertSvc.showSuccess('File uploaded successfully via SAS URL');
      await this.loadFiles();
    } catch (err) {
      console.error(err);
      this.alertSvc.showError('Failed to upload file');
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  protected async loadFiles() {
    this.isLoading.set(true);
    try {
      const res = await this.filesSvc.getAll();
      this.files.set(res.rows || []);
      this.applyFilter();
    } catch (_err) {
      this.alertSvc.showError('Failed to load files');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.applyFilter();
  }

  private applyFilter() {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) {
      this.filteredFiles.set(this.files());
      return;
    }

    const filtered = this.files().filter(
      (f) => f.filename?.toLowerCase().includes(q) || f.mime_type?.toLowerCase().includes(q),
    );
    this.filteredFiles.set(filtered);
  }

  protected formatBytes(bytes: number | null | undefined): string {
    if (bytes == null) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  protected getFileIcon(mime: string | null | undefined): PcIconNameType {
    if (!mime) return 'document';
    if (mime.includes('image')) return 'file-image';
    if (mime.includes('pdf')) return 'file-pdf';
    if (mime.includes('audio')) return 'file-audio';
    if (mime.includes('video')) return 'file-video';
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('gz')) return 'file-archive';
    return 'document';
  }

  protected downloadFile(file: any) {
    const token = this.tokenSvc.getAuthToken();
    const url = `${environment.apiUrl}/api/files/download/${file.id}?token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank');
  }

  protected async deleteFile(file: any) {
    const confirmed = await this.dialogs.confirm({
      title: 'Confirm Delete',
      message: `Are you sure you want to permanently delete "${file.filename}"? This will clean up the database record and delete the file from cloud storage.`,
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await this.filesSvc.delete(file.id);
      this.alertSvc.showSuccess('File deleted successfully');
      await this.loadFiles();
    } catch (_err) {
      this.alertSvc.showError('Failed to delete file');
    }
  }
}
