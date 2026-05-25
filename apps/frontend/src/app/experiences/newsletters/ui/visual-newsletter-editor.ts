import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';

export interface EmailBlock {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'footer';
  content?: string;
  styles?: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    textAlign?: 'left' | 'center' | 'right';
    paddingTop?: string;
    paddingBottom?: string;
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: string;
    height?: string;
  };
  linkUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: string;
  socials?: Array<{ platform: 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'youtube'; url: string }>;
  footerCompany?: string;
  footerAddress?: string;
  footerUnsubscribeUrl?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-visual-newsletter-editor',
  imports: [CommonModule, FormsModule, Icon],
  template: `
    <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-270px)] min-h-[600px] border border-base-300 rounded-lg overflow-hidden bg-base-100 shadow-inner">
      <!-- LEFT: VISUAL CANVAS PREVIEW -->
      <div class="flex-1 flex flex-col bg-base-200 h-full overflow-hidden">
        <!-- CANVAS HEADER / TOOLBAR -->
        <div class="flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-300">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Preview Mode:</span>
            <div class="join">
              <button
                type="button"
                class="btn btn-xs join-item"
                [class.btn-primary]="previewMode() === 'desktop'"
                [class.btn-ghost]="previewMode() !== 'desktop'"
                (click)="previewMode.set('desktop')"
                title="Desktop View"
              >
                <pc-icon name="view-column" [size]="4"></pc-icon>
                Desktop
              </button>
              <button
                type="button"
                class="btn btn-xs join-item"
                [class.btn-primary]="previewMode() === 'mobile'"
                [class.btn-ghost]="previewMode() !== 'mobile'"
                (click)="previewMode.set('mobile')"
                title="Mobile View"
              >
                <pc-icon name="collapse-content" [size]="4"></pc-icon>
                Mobile
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-base-content/60">Editor:</span>
            <button
              type="button"
              class="btn btn-xs btn-outline"
              [class.btn-active]="editorMode() === 'code'"
              (click)="toggleEditorMode()"
            >
              @if (editorMode() === 'visual') {
                <pc-icon name="file-code" [size]="4" class="mr-1"></pc-icon>
                View HTML
              } @else {
                <pc-icon name="eye" [size]="4" class="mr-1"></pc-icon>
                Visual Editor
              }
            </button>
          </div>
        </div>

        <!-- CANVAS CONTENT AREA -->
        <div class="flex-1 overflow-y-auto p-6 flex justify-center items-start">
          @if (editorMode() === 'visual') {
            <!-- EMAIL CANVAS WRAPPER -->
            <div
              class="bg-white text-black shadow-md rounded-lg overflow-hidden transition-all duration-300 relative border border-slate-200"
              [style.width]="previewMode() === 'mobile' ? '375px' : '100%'"
              [style.max-width]="previewMode() === 'mobile' ? '375px' : '600px'"
              style="min-height: 500px;"
            >
              <!-- CANVAS CONTAINER -->
              <div class="w-full bg-slate-100 py-6 px-4" style="min-height: 500px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <!-- Inner Email Content -->
                      <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        class="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm"
                      >
                        <tr>
                          <td style="padding: 0;">
                            @if (blocks().length === 0) {
                              <div class="p-8 text-center text-slate-400">
                                <pc-icon name="document-text" [size]="8" class="mx-auto text-slate-300 mb-2"></pc-icon>
                                <p class="text-sm font-medium">Your canvas is empty.</p>
                                <p class="text-xs text-slate-400 mt-1">Add blocks from the sidebar to begin designing.</p>
                              </div>
                            } @else {
                              @for (block of blocks(); track block.id; let idx = $index) {
                                <div
                                  class="group relative border-2 transition-all duration-150 cursor-pointer"
                                  [class.border-primary]="selectedBlockId() === block.id"
                                  [class.border-transparent]="selectedBlockId() !== block.id"
                                  [class.hover:border-primary/50]="selectedBlockId() !== block.id"
                                  (click)="selectBlock(block.id, $event)"
                                >
                                  <!-- Hover controls -->
                                  <div class="absolute -top-3 right-2 z-10 hidden group-hover:flex items-center gap-1 bg-primary text-primary-content text-[10px] rounded px-1 shadow-md">
                                    <button
                                      type="button"
                                      class="p-1 hover:bg-primary-focus rounded"
                                      (click)="moveBlockUp(idx, $event)"
                                      [disabled]="idx === 0"
                                      title="Move Up"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      class="p-1 hover:bg-primary-focus rounded"
                                      (click)="moveBlockDown(idx, $event)"
                                      [disabled]="idx === blocks().length - 1"
                                      title="Move Down"
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      class="p-1 hover:bg-primary-focus rounded"
                                      (click)="duplicateBlock(block, $event)"
                                      title="Duplicate"
                                    >
                                      ❐
                                    </button>
                                    <button
                                      type="button"
                                      class="p-1 hover:bg-error rounded text-red-100 hover:text-white"
                                      (click)="deleteBlock(block.id, $event)"
                                      title="Delete"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <!-- Block Renderers inside standard tables to mimic layout -->
                                  <!-- HEADING BLOCK -->
                                  @if (block.type === 'heading') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [style.padding-top.px]="block.styles?.paddingTop || 16"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 16"
                                          [style.color]="block.styles?.color || '#1f2937'"
                                          [style.font-size]="block.styles?.fontSize || '24px'"
                                          [style.text-align]="block.styles?.textAlign || 'center'"
                                          class="font-sans font-bold px-6 leading-tight select-none"
                                        >
                                          {{ block.content || 'Heading Block' }}
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- TEXT BLOCK -->
                                  @if (block.type === 'text') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [style.padding-top.px]="block.styles?.paddingTop || 12"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 12"
                                          [style.color]="block.styles?.color || '#4b5563'"
                                          [style.font-size]="block.styles?.fontSize || '16px'"
                                          [style.text-align]="block.styles?.textAlign || 'left'"
                                          class="font-sans px-6 leading-relaxed whitespace-pre-wrap select-none"
                                        >
                                          {{ block.content || 'Click here to write some text...' }}
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- IMAGE BLOCK -->
                                  @if (block.type === 'image') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [align]="block.styles?.textAlign || 'center'"
                                          [style.padding-top.px]="block.styles?.paddingTop || 12"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 12"
                                          class="px-6"
                                        >
                                          <img
                                            [src]="block.imageUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80'"
                                            [alt]="block.imageAlt || 'Newsletter Image'"
                                            [style.max-width]="block.imageWidth || '100%'"
                                            class="w-full height-auto border-0 block rounded"
                                          />
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- BUTTON BLOCK -->
                                  @if (block.type === 'button') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [align]="block.styles?.textAlign || 'center'"
                                          [style.padding-top.px]="block.styles?.paddingTop || 16"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 16"
                                          class="px-6"
                                        >
                                          <table border="0" cellpadding="0" cellspacing="0" class="border-separate">
                                            <tr>
                                              <td
                                                align="center"
                                                valign="middle"
                                                [style.background-color]="block.styles?.backgroundColor || '#2563eb'"
                                                [style.border-radius.px]="block.styles?.borderRadius || 6"
                                              >
                                                <span
                                                  class="inline-block px-6 py-3 font-sans font-bold select-none text-decoration-none"
                                                  [style.color]="block.styles?.color || '#ffffff'"
                                                  [style.font-size]="block.styles?.fontSize || '16px'"
                                                >
                                                  {{ block.content || 'Click Me' }}
                                                </span>
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- DIVIDER BLOCK -->
                                  @if (block.type === 'divider') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [style.padding-top.px]="block.styles?.paddingTop || 12"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 12"
                                          class="px-6"
                                        >
                                          <div
                                            [style.border-top-width.px]="block.styles?.borderWidth || 1"
                                            [style.border-top-color]="block.styles?.borderColor || '#e5e7eb'"
                                            class="border-t"
                                          ></div>
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- SPACER BLOCK -->
                                  @if (block.type === 'spacer') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [style.height.px]="block.styles?.height || 20"
                                          style="font-size: 0; line-height: 0;"
                                        >
                                          &nbsp;
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- SOCIAL LINKS BLOCK -->
                                  @if (block.type === 'social') {
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                      <tr>
                                        <td
                                          [align]="block.styles?.textAlign || 'center'"
                                          [style.padding-top.px]="block.styles?.paddingTop || 16"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 16"
                                          class="px-6"
                                        >
                                          <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                              @for (social of block.socials || []; track social.platform) {
                                                <td class="px-2">
                                                  <span
                                                    class="inline-block w-8 h-8 rounded-full text-center font-bold text-white text-sm select-none"
                                                    style="line-height: 32px;"
                                                    [class.bg-[#3b5998]]="social.platform === 'facebook'"
                                                    [class.bg-[#1da1f2]]="social.platform === 'twitter'"
                                                    [class.bg-[#0077b5]]="social.platform === 'linkedin'"
                                                    [class.bg-[#e1306c]]="social.platform === 'instagram'"
                                                    [class.bg-[#ff0000]]="social.platform === 'youtube'"
                                                  >
                                                    {{ social.platform.charAt(0).toUpperCase() }}
                                                  </span>
                                                </td>
                                              }
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                  }

                                  <!-- FOOTER BLOCK -->
                                  @if (block.type === 'footer') {
                                    <table
                                      border="0"
                                      cellpadding="0"
                                      cellspacing="0"
                                      width="100%"
                                      [style.background-color]="block.styles?.backgroundColor || '#f9fafb'"
                                    >
                                      <tr>
                                        <td
                                          [style.color]="block.styles?.color || '#9ca3af'"
                                          [style.padding-top.px]="block.styles?.paddingTop || 24"
                                          [style.padding-bottom.px]="block.styles?.paddingBottom || 24"
                                          class="font-sans px-6 text-xs text-center leading-normal"
                                        >
                                          <p class="font-bold mb-1">{{ block.footerCompany || 'Company Name Inc.' }}</p>
                                          <p class="mb-3">{{ block.footerAddress || '123 Address Rd, City, State' }}</p>
                                          <p>
                                            You are receiving this email because you opted in on our website.
                                            <br />
                                            <span class="underline text-primary">Unsubscribe</span>
                                          </p>
                                        </td>
                                      </tr>
                                    </table>
                                  }
                                </div>
                              }
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          } @else {
            <!-- RAW CODE VIEW -->
            <div class="w-full h-full flex flex-col gap-2">
              <div class="alert alert-warning text-xs py-2">
                <pc-icon name="exclamation-triangle" [size]="4" class="mr-1"></pc-icon>
                <span>
                  <strong>Caution:</strong> Editing raw HTML directly is fully supported, but manual changes cannot be converted back into visual blocks.
                </span>
              </div>
              <textarea
                class="textarea textarea-bordered font-mono text-xs w-full flex-1"
                [ngModel]="compiledHtml()"
                (ngModelChange)="handleRawHtmlEdit($event)"
                placeholder="Paste or edit HTML here..."
              ></textarea>
            </div>
          }
        </div>
      </div>

      <!-- RIGHT: CONTROL PANEL -->
      <aside class="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-base-300 bg-base-100 h-full overflow-hidden">
        <!-- TABS -->
        <div class="tabs tabs-lifted w-full px-4 pt-4 bg-base-200/50">
          <button
            type="button"
            class="tab"
            [class.tab-active]="activeTab() === 'blocks'"
            (click)="activeTab.set('blocks')"
          >
            Blocks
          </button>
          <button
            type="button"
            class="tab"
            [class.tab-active]="activeTab() === 'edit'"
            (click)="activeTab.set('edit')"
          >
            Customize
          </button>
          <button
            type="button"
            class="tab"
            [class.tab-active]="activeTab() === 'templates'"
            (click)="activeTab.set('templates')"
          >
            Templates
          </button>
        </div>

        <!-- TAB CONTENT -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- BLOCKS TAB -->
          @if (activeTab() === 'blocks') {
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-bold text-base-content/75 mb-1">Add Elements</h3>
                <p class="text-xs text-base-content/60">Click any block to insert it at the end of your newsletter.</p>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('heading')"
                >
                  <pc-icon name="document-text" [size]="5" class="text-primary"></pc-icon>
                  Heading
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('text')"
                >
                  <pc-icon name="document-text" [size]="5" class="text-success"></pc-icon>
                  Paragraph
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('image')"
                >
                  <pc-icon name="file-image" [size]="5" class="text-warning"></pc-icon>
                  Image
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('button')"
                >
                  <pc-icon name="star-filled" [size]="5" class="text-info"></pc-icon>
                  CTA Button
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('divider')"
                >
                  <pc-icon name="bars-3" [size]="5" class="text-neutral-content"></pc-icon>
                  Divider
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('spacer')"
                >
                  <pc-icon name="arrows-pointing-out" [size]="5"></pc-icon>
                  Spacer
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('social')"
                >
                  <pc-icon name="user-group" [size]="5" class="text-primary"></pc-icon>
                  Social Links
                </button>
                <button
                  type="button"
                  class="btn btn-outline btn-sm flex justify-start gap-2 h-12"
                  (click)="addBlock('footer')"
                >
                  <pc-icon name="home" [size]="5" class="text-secondary"></pc-icon>
                  Email Footer
                </button>
              </div>

              <!-- Quick action tip -->
              <div class="mt-4 rounded bg-info/10 border border-info/20 p-3 text-xs text-info-content">
                <p><strong>Tip:</strong> Hover over blocks on the canvas to move them up/down, duplicate, or delete them.</p>
              </div>
            </div>
          }

          <!-- EDIT TAB -->
          @if (activeTab() === 'edit') {
            @if (selectedBlock(); as block) {
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-base-200 pb-2">
                  <span class="text-xs uppercase font-bold text-base-content/60">Selected: {{ block.type }}</span>
                  <button
                    type="button"
                    class="btn btn-xs btn-error text-white"
                    (click)="deleteBlock(block.id)"
                  >
                    Delete Block
                  </button>
                </div>

                <!-- HEADING AND TEXT EDIT FIELDS -->
                @if (block.type === 'heading' || block.type === 'text') {
                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Text Content</label>
                    @if (block.type === 'heading') {
                      <input
                        type="text"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.content"
                        (ngModelChange)="updateBlocks()"
                      />
                    } @else {
                      <textarea
                        class="textarea textarea-bordered w-full textarea-sm min-h-24"
                        [(ngModel)]="block.content"
                        (ngModelChange)="updateBlocks()"
                      ></textarea>
                    }
                  </div>

                  <!-- Text Styles -->
                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Font Size</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.styles!.fontSize"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="12px">12px (Small)</option>
                        <option value="14px">14px</option>
                        <option value="16px">16px (Normal)</option>
                        <option value="18px">18px</option>
                        <option value="20px">20px (H3)</option>
                        <option value="24px">24px (H2)</option>
                        <option value="28px">28px (H1)</option>
                        <option value="32px">32px</option>
                        <option value="36px">36px (Large)</option>
                      </select>
                    </div>

                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Text Align</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.styles!.textAlign"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Text Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.color"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Color Hex</label>
                      <input
                        type="text"
                        class="input input-bordered input-sm w-full font-mono text-xs"
                        [(ngModel)]="block.styles!.color"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                  </div>
                }

                <!-- IMAGE EDIT FIELDS -->
                @if (block.type === 'image') {
                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Image URL</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.imageUrl"
                      (ngModelChange)="updateBlocks()"
                      placeholder="https://..."
                    />
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Alt Text</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.imageAlt"
                      (ngModelChange)="updateBlocks()"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Max Width (e.g. 100%, 300px)</label>
                      <input
                        type="text"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.imageWidth"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>

                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Alignment</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.styles!.textAlign"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Link URL (Optional)</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.linkUrl"
                      (ngModelChange)="updateBlocks()"
                      placeholder="https://..."
                    />
                  </div>
                }

                <!-- BUTTON EDIT FIELDS -->
                @if (block.type === 'button') {
                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Button Text</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.content"
                      (ngModelChange)="updateBlocks()"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Link URL</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.linkUrl"
                      (ngModelChange)="updateBlocks()"
                      placeholder="https://..."
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Bg Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.backgroundColor"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Text Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.color"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Border Radius (px)</label>
                      <input
                        type="number"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.styles!.borderRadius"
                        (ngModelChange)="updateBlocks()"
                        min="0"
                        max="30"
                      />
                    </div>

                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Alignment</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.styles!.textAlign"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                }

                <!-- DIVIDER EDIT FIELDS -->
                @if (block.type === 'divider') {
                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Divider Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.borderColor"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>

                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Line Thickness (px)</label>
                      <input
                        type="number"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.styles!.borderWidth"
                        (ngModelChange)="updateBlocks()"
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                }

                <!-- SPACER EDIT FIELDS -->
                @if (block.type === 'spacer') {
                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Spacer Height (px)</label>
                    <input
                      type="number"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.styles!.height"
                      (ngModelChange)="updateBlocks()"
                      min="5"
                      max="150"
                      step="5"
                    />
                  </div>
                }

                <!-- SOCIAL LINKS EDIT FIELDS -->
                @if (block.type === 'social') {
                  <div class="space-y-2">
                    <label class="label text-xs font-semibold py-1">Social Networks</label>
                    @for (social of block.socials; track social.platform) {
                      <div class="flex flex-col gap-1 border border-base-200 rounded p-2 bg-base-50">
                        <span class="text-[10px] font-bold uppercase text-base-content/60">{{ social.platform }} URL</span>
                        <input
                          type="text"
                          class="input input-bordered input-xs w-full font-mono"
                          [(ngModel)]="social.url"
                          (ngModelChange)="updateBlocks()"
                          placeholder="https://..."
                        />
                      </div>
                    }

                    <div class="form-control mt-2">
                      <label class="label text-xs font-semibold py-1">Alignment</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.styles!.textAlign"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                }

                <!-- FOOTER EDIT FIELDS -->
                @if (block.type === 'footer') {
                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Company Name</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.footerCompany"
                      (ngModelChange)="updateBlocks()"
                    />
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Address Info</label>
                    <textarea
                      class="textarea textarea-bordered w-full textarea-sm min-h-16"
                      [(ngModel)]="block.footerAddress"
                      (ngModelChange)="updateBlocks()"
                    ></textarea>
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Unsubscribe Link</label>
                    <input
                      type="text"
                      class="input input-bordered w-full input-sm"
                      [(ngModel)]="block.footerUnsubscribeUrl"
                      (ngModelChange)="updateBlocks()"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Bg Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.backgroundColor"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Text Color</label>
                      <input
                        type="color"
                        class="input input-bordered p-1 w-full h-8"
                        [(ngModel)]="block.styles!.color"
                        (ngModelChange)="updateBlocks()"
                      />
                    </div>
                  </div>
                }

                <!-- COMMON BLOCK PADDING SETTINGS -->
                <div class="border-t border-base-200 pt-3 mt-3">
                  <h4 class="text-xs font-bold text-base-content/60 mb-2">Block Margins</h4>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="form-control">
                      <label class="label text-[10px] uppercase font-bold py-0">Padding Top (px)</label>
                      <input
                        type="number"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.styles!.paddingTop"
                        (ngModelChange)="updateBlocks()"
                        min="0"
                        max="80"
                      />
                    </div>

                    <div class="form-control">
                      <label class="label text-[10px] uppercase font-bold py-0">Padding Bottom (px)</label>
                      <input
                        type="number"
                        class="input input-bordered w-full input-sm"
                        [(ngModel)]="block.styles!.paddingBottom"
                        (ngModelChange)="updateBlocks()"
                        min="0"
                        max="80"
                      />
                    </div>
                  </div>
                </div>
              </div>
            } @else {
              <div class="h-48 flex flex-col justify-center items-center text-center text-base-content/40 p-4">
                <pc-icon name="pencil-square" [size]="8" class="text-base-content/30 mb-2"></pc-icon>
                <p class="text-sm font-semibold">No Block Selected</p>
                <p class="text-xs mt-1">Click on any block inside the preview area to edit its content and styling.</p>
              </div>
            }
          }

          <!-- TEMPLATES TAB -->
          @if (activeTab() === 'templates') {
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-bold text-base-content/75 mb-1">Layout Presets</h3>
                <p class="text-xs text-base-content/60">Choose a layout template. Warning: This will overwrite your current draft.</p>
              </div>

              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="btn btn-outline btn-sm justify-start text-left h-auto py-3 px-4 flex gap-3"
                  (click)="loadTemplate('welcome')"
                >
                  <div class="rounded bg-primary/10 p-2 text-primary">👋</div>
                  <div>
                    <div class="font-bold text-sm">Welcome Email</div>
                    <div class="text-xs font-normal text-base-content/60">Heading, banner image, greeting, call-to-action button, social icons, footer.</div>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn btn-outline btn-sm justify-start text-left h-auto py-3 px-4 flex gap-3"
                  (click)="loadTemplate('product')"
                >
                  <div class="rounded bg-success/10 p-2 text-success">🚀</div>
                  <div>
                    <div class="font-bold text-sm">Product Update</div>
                    <div class="text-xs font-normal text-base-content/60">Featured title, mockup image, core benefit list, CTA button, footer.</div>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn btn-outline btn-sm justify-start text-left h-auto py-3 px-4 flex gap-3"
                  (click)="loadTemplate('newsletter')"
                >
                  <div class="rounded bg-warning/10 p-2 text-warning">📰</div>
                  <div>
                    <div class="font-bold text-sm">Standard Newsletter</div>
                    <div class="text-xs font-normal text-base-content/60">Heading, spacer, short greeting text, divider, main paragraph.</div>
                  </div>
                </button>

                <button
                  type="button"
                  class="btn btn-outline btn-sm justify-start text-left h-auto py-3 px-4 flex gap-3"
                  (click)="loadTemplate('empty')"
                >
                  <div class="rounded bg-base-200 p-2 text-base-content">📄</div>
                  <div>
                    <div class="font-bold text-sm">Empty Canvas</div>
                    <div class="text-xs font-normal text-base-content/60">Start from scratch with a single heading block.</div>
                  </div>
                </button>
              </div>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      .tabs-lifted .tab {
        border-bottom-color: transparent;
      }
      .tabs-lifted .tab-active {
        border-bottom-color: transparent;
      }
    `,
  ],
})
export class VisualNewsletterEditorComponent implements OnInit {
  @Input() public htmlContent = '';
  @Input() public plainTextContent = '';

  @Output() public readonly htmlContentChange = new EventEmitter<string>();
  @Output() public readonly plainTextContentChange = new EventEmitter<string>();

  protected readonly blocks = signal<EmailBlock[]>([]);
  protected readonly selectedBlockId = signal<string | null>(null);
  protected readonly previewMode = signal<'desktop' | 'mobile'>('desktop');
  protected readonly editorMode = signal<'visual' | 'code'>('visual');
  protected readonly activeTab = signal<'blocks' | 'edit' | 'templates'>('blocks');

  // Computed signals
  protected readonly selectedBlock = computed(() => {
    const id = this.selectedBlockId();
    if (!id) return null;
    return this.blocks().find((b) => b.id === id) ?? null;
  });

  protected readonly compiledHtml = computed(() => {
    return this.compileHtml(this.blocks());
  });

  public ngOnInit(): void {
    // Check if the incoming HTML has our saved JSON blocks comment
    const matched = this.htmlContent.match(/<!-- PPLCRM_VISUAL_BLOCKS_DATA: ([\s\S]*?) -->/);
    if (matched && matched[1]) {
      try {
        const decoded = decodeURIComponent(matched[1].trim());
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          this.blocks.set(parsed);
          if (parsed.length > 0) {
            this.selectedBlockId.set(parsed[0].id);
            this.activeTab.set('edit');
          }
          return;
        }
      } catch (err) {
        console.error('Failed to parse embedded visual block metadata. Defaulting to template.', err);
      }
    }

    // Default: Check if we have standard HTML pasted. If not, load default welcome template
    if (this.htmlContent && this.htmlContent.trim().length > 100) {
      // Legacy custom HTML detected. Set editor to code mode
      this.editorMode.set('code');
    } else {
      // Load standard default Welcome Email template
      this.loadTemplate('welcome', false);
    }
  }

  protected selectBlock(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedBlockId.set(id);
    this.activeTab.set('edit');
  }

  protected toggleEditorMode(): void {
    const current = this.editorMode();
    if (current === 'visual') {
      this.editorMode.set('code');
    } else {
      // Switch back to visual, warning that edits made in code view will be reset
      this.editorMode.set('visual');
      this.updateBlocks();
    }
  }

  protected addBlock(
    type: 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'footer',
  ): void {
    const id = Math.random().toString(36).substring(2, 9);
    const styles: NonNullable<EmailBlock['styles']> = {
      textAlign: 'center',
      paddingTop: '16',
      paddingBottom: '16',
    };

    const newBlock: EmailBlock = {
      id,
      type,
      styles,
    };

    // Set block defaults
    if (type === 'heading') {
      newBlock.content = 'Heading Title';
      styles.fontSize = '24px';
      styles.color = '#1f2937';
    } else if (type === 'text') {
      newBlock.content = 'Write your custom message paragraph here. Support multiple paragraphs and inline styling.';
      styles.fontSize = '16px';
      styles.color = '#4b5563';
      styles.textAlign = 'left';
    } else if (type === 'image') {
      newBlock.imageUrl = 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80';
      newBlock.imageAlt = 'Banner image';
      newBlock.imageWidth = '100%';
    } else if (type === 'button') {
      newBlock.content = 'Click Here';
      newBlock.linkUrl = 'https://example.com';
      styles.backgroundColor = '#2563eb';
      styles.color = '#ffffff';
      styles.borderRadius = '6';
      styles.fontSize = '16px';
    } else if (type === 'divider') {
      styles.borderColor = '#e5e7eb';
      styles.borderWidth = '1';
    } else if (type === 'spacer') {
      styles.height = '20';
    } else if (type === 'social') {
      newBlock.socials = [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'twitter', url: 'https://twitter.com' },
        { platform: 'linkedin', url: 'https://linkedin.com' },
        { platform: 'instagram', url: 'https://instagram.com' },
      ];
    } else if (type === 'footer') {
      newBlock.footerCompany = 'PeopleCRM Inc.';
      newBlock.footerAddress = '123 Main St, Suite 400, San Francisco, CA 94105';
      newBlock.footerUnsubscribeUrl = 'https://example.com/unsubscribe';
      styles.backgroundColor = '#f9fafb';
      styles.color = '#9ca3af';
    }

    const currentBlocks = [...this.blocks(), newBlock];
    this.blocks.set(currentBlocks);
    this.selectBlock(id);
    this.updateBlocks();
  }

  protected deleteBlock(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const filtered = this.blocks().filter((b) => b.id !== id);
    this.blocks.set(filtered);
    if (this.selectedBlockId() === id) {
      this.selectedBlockId.set(filtered.length > 0 ? filtered[0].id : null);
    }
    this.updateBlocks();
  }

  protected duplicateBlock(block: EmailBlock, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const idx = this.blocks().findIndex((b) => b.id === block.id);
    if (idx === -1) return;

    const id = Math.random().toString(36).substring(2, 9);
    const clone: EmailBlock = JSON.parse(JSON.stringify(block));
    clone.id = id;

    const list = [...this.blocks()];
    list.splice(idx + 1, 0, clone);
    this.blocks.set(list);
    this.selectBlock(id);
    this.updateBlocks();
  }

  protected moveBlockUp(idx: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (idx <= 0) return;
    const list = [...this.blocks()];
    const temp = list[idx];
    list[idx] = list[idx - 1];
    list[idx - 1] = temp;
    this.blocks.set(list);
    this.updateBlocks();
  }

  protected moveBlockDown(idx: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (idx >= this.blocks().length - 1) return;
    const list = [...this.blocks()];
    const temp = list[idx];
    list[idx] = list[idx + 1];
    list[idx + 1] = temp;
    this.blocks.set(list);
    this.updateBlocks();
  }

  protected updateBlocks(): void {
    const list = [...this.blocks()];
    // Trigger signal recomputation and propagation
    this.blocks.set(list);
    this.propagateChanges();
  }

  protected handleRawHtmlEdit(html: string): void {
    this.htmlContent = html;
    this.htmlContentChange.emit(html);
    // Simple text version conversion from html tags
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    this.plainTextContentChange.emit(text);
  }

  protected loadTemplate(preset: 'welcome' | 'product' | 'newsletter' | 'empty', triggerPropagate = true): void {
    let tpl: EmailBlock[] = [];

    if (preset === 'welcome') {
      tpl = [
        {
          id: 'w1',
          type: 'spacer',
          styles: { height: '20' },
        },
        {
          id: 'w2',
          type: 'heading',
          content: 'Welcome to Our Community!',
          styles: { textAlign: 'center', fontSize: '28px', color: '#1f2937', paddingTop: '10', paddingBottom: '10' },
        },
        {
          id: 'w3',
          type: 'image',
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
          imageAlt: 'Team welcome banner',
          imageWidth: '100%',
          styles: { textAlign: 'center', paddingTop: '10', paddingBottom: '10' },
        },
        {
          id: 'w4',
          type: 'text',
          content: 'Hi there,\n\nWe are absolutely thrilled to have you here! Our mission is to help you build better relationships, track your sales pipelining, and manage your contacts with ease.\n\nWe\'ll send you weekly newsletters packed with tips, product updates, and strategies to make your business flourish. Stay tuned!',
          styles: { textAlign: 'left', fontSize: '16px', color: '#4b5563', paddingTop: '15', paddingBottom: '15' },
        },
        {
          id: 'w5',
          type: 'button',
          content: 'Get Started Now',
          linkUrl: 'https://example.com/start',
          styles: { textAlign: 'center', backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '6', fontSize: '16px', paddingTop: '15', paddingBottom: '15' },
        },
        {
          id: 'w6',
          type: 'divider',
          styles: { borderColor: '#e5e7eb', borderWidth: '1', paddingTop: '10', paddingBottom: '10' },
        },
        {
          id: 'w7',
          type: 'social',
          socials: [
            { platform: 'facebook', url: 'https://facebook.com' },
            { platform: 'twitter', url: 'https://twitter.com' },
            { platform: 'linkedin', url: 'https://linkedin.com' },
            { platform: 'instagram', url: 'https://instagram.com' },
          ],
          styles: { textAlign: 'center', paddingTop: '10', paddingBottom: '10' },
        },
        {
          id: 'w8',
          type: 'footer',
          footerCompany: 'PeopleCRM Inc.',
          footerAddress: '123 Main St, Suite 400, San Francisco, CA 94105',
          footerUnsubscribeUrl: 'https://example.com/unsubscribe',
          styles: { backgroundColor: '#f9fafb', color: '#9ca3af', paddingTop: '24', paddingBottom: '24' },
        },
      ];
    } else if (preset === 'product') {
      tpl = [
        {
          id: 'p1',
          type: 'spacer',
          styles: { height: '15' },
        },
        {
          id: 'p2',
          type: 'heading',
          content: '🚀 Introducing Visual Newsletters!',
          styles: { textAlign: 'center', fontSize: '32px', color: '#111827', paddingTop: '10', paddingBottom: '5' },
        },
        {
          id: 'p3',
          type: 'image',
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
          imageAlt: 'Visual designer workspace',
          imageWidth: '100%',
          styles: { textAlign: 'center', paddingTop: '15', paddingBottom: '15' },
        },
        {
          id: 'p4',
          type: 'text',
          content: 'Today, we are officially launching our visual drag-and-drop newsletter builder.\n\nNow, anyone on your team can create gorgeous marketing campaigns, publish announcements, or schedule monthly digests without writing any raw HTML. It is responsive out of the box, optimized for modern email clients, and integrates seamlessly with your audience lists.',
          styles: { textAlign: 'left', fontSize: '16px', color: '#374151', paddingTop: '10', paddingBottom: '15' },
        },
        {
          id: 'p5',
          type: 'button',
          content: 'Try Visual Builder',
          linkUrl: 'https://example.com/dashboard/newsletters',
          styles: { textAlign: 'center', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '6', fontSize: '16px', paddingTop: '15', paddingBottom: '15' },
        },
        {
          id: 'p6',
          type: 'footer',
          footerCompany: 'PeopleCRM Inc.',
          footerAddress: '123 Main St, Suite 400, San Francisco, CA 94105',
          footerUnsubscribeUrl: 'https://example.com/unsubscribe',
          styles: { backgroundColor: '#f9fafb', color: '#9ca3af', paddingTop: '24', paddingBottom: '24' },
        },
      ];
    } else if (preset === 'newsletter') {
      tpl = [
        {
          id: 'n1',
          type: 'heading',
          content: 'Weekly Digest',
          styles: { textAlign: 'center', fontSize: '28px', color: '#111827', paddingTop: '15', paddingBottom: '5' },
        },
        {
          id: 'n2',
          type: 'divider',
          styles: { borderColor: '#111827', borderWidth: '2', paddingTop: '5', paddingBottom: '15' },
        },
        {
          id: 'n3',
          type: 'text',
          content: 'Here is what is happening around the platform this week:\n\n• List Sync has been updated to support faster exports.\n• Household reassignment logic fixes are now live.\n• Security and role access controls have been strengthened.',
          styles: { textAlign: 'left', fontSize: '15px', color: '#374151', paddingTop: '10', paddingBottom: '15' },
        },
        {
          id: 'n4',
          type: 'footer',
          footerCompany: 'PeopleCRM Inc.',
          footerAddress: '123 Main St, Suite 400, San Francisco, CA 94105',
          footerUnsubscribeUrl: 'https://example.com/unsubscribe',
          styles: { backgroundColor: '#f9fafb', color: '#9ca3af', paddingTop: '24', paddingBottom: '24' },
        },
      ];
    } else {
      tpl = [
        {
          id: 'e1',
          type: 'heading',
          content: 'Start Designing Your Newsletter',
          styles: { textAlign: 'center', fontSize: '24px', color: '#1f2937', paddingTop: '20', paddingBottom: '20' },
        },
      ];
    }

    this.blocks.set(tpl);
    this.selectedBlockId.set(tpl[0]?.id || null);
    this.activeTab.set('edit');

    if (triggerPropagate) {
      this.propagateChanges();
    }
  }

  private propagateChanges(): void {
    const html = this.compiledHtml();
    const text = this.compilePlainText(this.blocks());

    this.htmlContentChange.emit(html);
    this.plainTextContentChange.emit(text);
  }

  private compileHtml(blockList: EmailBlock[]): string {
    let blocksHtml = '';

    for (const block of blockList) {
      const pTop = block.styles?.paddingTop || '12';
      const pBottom = block.styles?.paddingBottom || '12';
      const tAlign = block.styles?.textAlign || 'center';
      const color = block.styles?.color || '#333333';
      const fSize = block.styles?.fontSize || '16px';
      const bg = block.styles?.backgroundColor || '#ffffff';
      const radius = block.styles?.borderRadius || '4';

      if (block.type === 'heading') {
        blocksHtml += `
          <!-- Block: Heading -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: ${pTop}px 24px ${pBottom}px 24px; color: ${color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: ${fSize}; font-weight: bold; text-align: ${tAlign}; line-height: 1.3;">
                ${block.content || ''}
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'text') {
        // Convert newlines to breaks
        const textContent = (block.content || '').replace(/\n/g, '<br />');
        blocksHtml += `
          <!-- Block: Text -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: ${pTop}px 24px ${pBottom}px 24px; color: ${color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: ${fSize}; text-align: ${tAlign}; line-height: 1.6;">
                ${textContent}
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'image') {
        const imgUrl = block.imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80';
        const imgAlt = block.imageAlt || 'Image';
        const imgWidth = block.imageWidth || '100%';
        const maxWStyle = imgWidth.endsWith('%') ? `width: ${imgWidth}; max-width: 100%;` : `width: 100%; max-width: ${imgWidth};`;

        let imgHtml = `<img src="${imgUrl}" alt="${imgAlt}" style="display: block; ${maxWStyle} height: auto; border: 0; border-radius: 4px;" />`;
        if (block.linkUrl) {
          imgHtml = `<a href="${block.linkUrl}" target="_blank" style="text-decoration: none;">${imgHtml}</a>`;
        }

        blocksHtml += `
          <!-- Block: Image -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="${tAlign}" style="padding: ${pTop}px 24px ${pBottom}px 24px;">
                ${imgHtml}
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'button') {
        const btnLink = block.linkUrl || '#';
        blocksHtml += `
          <!-- Block: Button -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="${tAlign}" style="padding: ${pTop}px 24px ${pBottom}px 24px;">
                <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
                  <tr>
                    <td align="center" valign="middle" bgcolor="${bg}" style="border-radius: ${radius}px;">
                      <a href="${btnLink}" target="_blank" style="display: inline-block; padding: 12px 24px; color: ${color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: ${fSize}; font-weight: bold; text-decoration: none; border-radius: ${radius}px;">
                        ${block.content || ''}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'divider') {
        const borderW = block.styles?.borderWidth || '1';
        const borderC = block.styles?.borderColor || '#e5e7eb';
        blocksHtml += `
          <!-- Block: Divider -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding: ${pTop}px 24px ${pBottom}px 24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="border-top: ${borderW}px solid ${borderC}; font-size: 0; line-height: 0;">
                      &nbsp;
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'spacer') {
        const h = block.styles?.height || '20';
        blocksHtml += `
          <!-- Block: Spacer -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td height="${h}" style="font-size: 0; line-height: 0;">
                &nbsp;
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'social') {
        let tdSocials = '';
        for (const social of block.socials || []) {
          const char = social.platform.charAt(0).toUpperCase();
          let pColor = '#3b82f6';
          if (social.platform === 'facebook') pColor = '#3b5998';
          if (social.platform === 'twitter') pColor = '#1da1f2';
          if (social.platform === 'linkedin') pColor = '#0077b5';
          if (social.platform === 'instagram') pColor = '#e1306c';
          if (social.platform === 'youtube') pColor = '#ff0000';

          tdSocials += `
            <td style="padding: 0 8px;">
              <a href="${social.url || '#'}" target="_blank" style="text-decoration: none; display: inline-block; width: 32px; height: 32px; background-color: ${pColor}; border-radius: 50%; text-align: center; line-height: 32px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: bold; font-size: 14px;">
                ${char}
              </a>
            </td>`;
        }

        blocksHtml += `
          <!-- Block: Social Links -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="${tAlign}" style="padding: ${pTop}px 24px ${pBottom}px 24px;">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    ${tdSocials}
                  </tr>
                </table>
              </td>
            </tr>
          </table>`;
      } else if (block.type === 'footer') {
        const footerCompany = block.footerCompany || '';
        const footerAddress = (block.footerAddress || '').replace(/\n/g, '<br />');
        const unsubLink = block.footerUnsubscribeUrl || '#';

        blocksHtml += `
          <!-- Block: Footer -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${bg}">
            <tr>
              <td style="padding: ${pTop}px 24px ${pBottom}px 24px; color: ${color}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; text-align: center; line-height: 1.5;">
                <p style="margin: 0 0 4px 0; font-weight: bold;">${footerCompany}</p>
                <p style="margin: 0 0 12px 0;">${footerAddress}</p>
                <p style="margin: 0;">
                  You are receiving this email because you opted in on our website.
                  <br />
                  <a href="${unsubLink}" target="_blank" style="color: ${color}; text-decoration: underline;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>`;
      }
    }

    // Embed the JSON block structure inside the HTML so we can reload it visually next time
    const jsonString = encodeURIComponent(JSON.stringify(blockList));
    const metadataComment = `<!-- PPLCRM_VISUAL_BLOCKS_DATA: ${jsonString} -->`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      display: block;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 0;">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${metadataComment}
</body>
</html>`;
  }

  private compilePlainText(blockList: EmailBlock[]): string {
    let text = '';

    for (const block of blockList) {
      if (block.type === 'heading') {
        text += `\n\n${block.content || ''}\n====================\n`;
      } else if (block.type === 'text') {
        text += `\n\n${block.content || ''}\n`;
      } else if (block.type === 'image') {
        text += `\n\n[Image: ${block.imageAlt || ''}] (${block.imageUrl || ''})\n`;
      } else if (block.type === 'button') {
        text += `\n\n${block.content || 'Click Here'}: ${block.linkUrl || ''}\n`;
      } else if (block.type === 'divider') {
        text += `\n\n-----------------------------------------\n`;
      } else if (block.type === 'spacer') {
        text += `\n`;
      } else if (block.type === 'social') {
        text += '\n\n';
        for (const social of block.socials || []) {
          text += `${social.platform.toUpperCase()}: ${social.url || ''} | `;
        }
        text += '\n';
      } else if (block.type === 'footer') {
        text += `\n\n${block.footerCompany || ''}\n${block.footerAddress || ''}\nUnsubscribe: ${block.footerUnsubscribeUrl || ''}\n`;
      }
    }

    return text.trim();
  }
}
