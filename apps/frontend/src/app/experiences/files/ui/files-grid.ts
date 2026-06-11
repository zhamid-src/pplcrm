import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FilesService } from '../services/files.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TokenService } from '../../../services/api/token-service';
import { environment } from '../../../../environments/environment';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '../../../uxcommon/components/icons/icons.index';

@Component({
  selector: 'pc-files-grid',
  imports: [DatePipe, Icon],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <pc-icon name="document" class="text-primary" [size]="7"></pc-icon>
            Uploaded Files Manager
          </h1>
          <p class="text-sm text-base-content/60 mt-1">
            Browse, download, and delete files uploaded across the CRM system.
          </p>
        </div>
        <div class="flex gap-2 items-center">
          <input
            #fileInput
            type="file"
            class="hidden"
            (change)="onFileSelectedForUpload($event)"
          />
          <button 
            class="btn btn-primary btn-sm gap-2" 
            [disabled]="isUploading()"
            (click)="fileInput.click()"
          >
            @if (isUploading()) {
              <span class="loading loading-spinner loading-xs"></span>
              Uploading...
            } @else {
              <pc-icon name="plus" [size]="4"></pc-icon>
              Upload File
            }
          </button>
          <input
            type="text"
            class="input input-bordered input-sm max-w-xs"
            placeholder="Search files..."
            (input)="onSearch($event)"
          />
          <button class="btn btn-outline btn-sm gap-2" (click)="loadFiles()">
            <pc-icon name="arrow-path" [size]="4"></pc-icon>
            Reload
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
      <div class="flex flex-col items-center justify-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/60 mt-4">Loading files...</p>
      </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && filteredFiles().length === 0) {
      <div class="card bg-base-100 border border-base-300 shadow-xl max-w-md mx-auto mt-10">
        <div class="card-body items-center text-center py-12">
          <pc-icon name="information-circle" class="text-base-content/30 mb-2" [size]="10"></pc-icon>
          <h2 class="card-title text-base-content/70">No files found</h2>
          <p class="text-sm text-base-content/50 mt-1">
            There are no files uploaded or matching your search criteria.
          </p>
        </div>
      </div>
      }

      <!-- Grid / Table View -->
      @if (!isLoading() && filteredFiles().length > 0) {
      <div class="overflow-x-auto border border-base-300 rounded-xl bg-base-100 shadow-xl">
        <table class="table w-full">
          <thead>
            <tr class="bg-base-200/50">
              <th>Filename</th>
              <th>MIME Type</th>
              <th>Size</th>
              <th>Uploaded Date</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (file of filteredFiles(); track file.id) {
            <tr class="hover:bg-base-200/30 transition-all duration-200">
              <td>
                <div class="flex items-center gap-3">
                  <pc-icon [name]="getFileIcon(file.mime_type)" class="text-primary/70" [size]="6"></pc-icon>
                  <span class="font-semibold text-base-content">{{ file.filename }}</span>
                </div>
              </td>
              <td>
                <span class="badge badge-neutral text-xs font-mono">{{ file.mime_type || 'unknown' }}</span>
              </td>
              <td>
                <span class="text-sm text-base-content/70">{{ formatBytes(file.size_bytes) }}</span>
              </td>
              <td>
                <span class="text-sm text-base-content/70">{{ file.created_at | date:'medium' }}</span>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-2">
                  <button 
                    class="btn btn-sm btn-circle btn-ghost text-primary" 
                    title="Download file"
                    (click)="downloadFile(file)"
                  >
                    <pc-icon name="arrow-down-tray" [size]="4"></pc-icon>
                  </button>
                  <button 
                    class="btn btn-sm btn-circle btn-ghost text-error" 
                    title="Delete file"
                    (click)="deleteFile(file)"
                  >
                    <pc-icon name="trash" [size]="4"></pc-icon>
                  </button>
                </div>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }
  `]
})
export class FilesGrid implements OnInit {
  private readonly filesSvc = inject(FilesService);
  private readonly alertSvc = inject(AlertService);
  private readonly tokenSvc = inject(TokenService);

  protected readonly files = signal<any[]>([]);
  protected readonly filteredFiles = signal<any[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly searchQuery = signal('');

  public ngOnInit() {
    this.loadFiles();
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
    } catch (err) {
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
      (f) =>
        f.filename?.toLowerCase().includes(q) ||
        f.mime_type?.toLowerCase().includes(q)
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

  protected deleteFile(file: any) {
    this.alertSvc.show({
      title: 'Confirm Delete',
      text: `Are you sure you want to permanently delete "${file.filename}"? This will clean up the database record and delete the file from cloud storage.`,
      type: 'warning',
      OKBtn: 'Delete',
      btn2: 'Cancel',
      OKBtnCallback: async () => {
        try {
          await this.filesSvc.delete(file.id);
          this.alertSvc.showSuccess('File deleted successfully');
          await this.loadFiles();
        } catch (err) {
          this.alertSvc.showError('Failed to delete file');
        }
      }
    });
  }
}
