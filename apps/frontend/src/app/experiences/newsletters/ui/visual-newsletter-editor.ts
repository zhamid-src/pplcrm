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

import {
  EmailBlock,
  socialSvgPaths,
  getSocialBgColor,
  getSocialIconColor,
  getTemplateBlocks,
  compileBlocksToHtml,
  compileBlocksToPlainText,
} from './newsletter-templates';

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
                                          [innerHTML]="resolveVariablesForPreview(block.content || 'Heading Block', false)"
                                        >
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
                                          [innerHTML]="resolveVariablesForPreview(block.content || 'Click here to write some text...', false)"
                                        >
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
                                                  [innerHTML]="resolveVariablesForPreview(block.content || 'Click Me', true)"
                                                >
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
                                                    class="inline-flex items-center justify-center w-8 h-8 select-none"
                                                    [style.background-color]="getSocialBgColor(social.platform, block.socialIconStyle || 'circular-solid')"
                                                    [style.color]="getSocialIconColor(social.platform, block.socialIconStyle || 'circular-solid')"
                                                    [style.border-radius]="(block.socialIconStyle || 'circular-solid').startsWith('circular') ? '50%' : '0%'"
                                                  >
                                                    <svg
                                                      viewBox="0 0 24 24"
                                                      class="w-4 h-4 fill-current"
                                                      style="display: block; width: 16px; height: 16px;"
                                                    >
                                                      <path [attr.d]="socialSvgPaths[social.platform]"></path>
                                                    </svg>
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
                                          <p class="font-bold mb-1" [innerHTML]="resolveVariablesForPreview(block.footerCompany || 'Company Name Inc.', false)"></p>
                                          <p class="mb-3 whitespace-pre-wrap" [innerHTML]="resolveVariablesForPreview(block.footerAddress || '123 Address Rd, City, State', false)"></p>
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
                    
                    <!-- Quick-Insert Variables -->
                    <div class="mt-2 p-2 bg-base-200/50 rounded-md border border-base-300">
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-bold uppercase text-base-content/60">Insert Variable</span>
                        <span class="text-[9px] text-base-content/50">Tip: Use &#123;FirstName|Friend&#125; for fallbacks</span>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'FirstName', 'content')"
                          title="Click to insert First Name placeholder"
                        >
                          + First Name
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'LastName', 'content')"
                          title="Click to insert Last Name placeholder"
                        >
                          + Last Name
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'Email', 'content')"
                          title="Click to insert Email placeholder"
                        >
                          + Email
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'Company', 'content')"
                          title="Click to insert Company placeholder"
                        >
                          + Company
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'JobTitle', 'content')"
                          title="Click to insert Job Title placeholder"
                        >
                          + Job Title
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'Phone', 'content')"
                          title="Click to insert Phone placeholder"
                        >
                          + Phone
                        </button>
                      </div>
                    </div>
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
                    
                    <!-- Quick-Insert Variables -->
                    <div class="mt-2 p-2 bg-base-200/50 rounded-md border border-base-300">
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-bold uppercase text-base-content/60">Insert Variable</span>
                        <span class="text-[9px] text-base-content/50">Tip: Use &#123;FirstName|Friend&#125; for fallbacks</span>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'FirstName', 'content')"
                          title="Click to insert First Name placeholder"
                        >
                          + First Name
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'LastName', 'content')"
                          title="Click to insert Last Name placeholder"
                        >
                          + Last Name
                        </button>
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary py-0.5 px-1.5 h-auto min-h-0 text-[10px]"
                          (click)="insertVariable(block, 'Email', 'content')"
                          title="Click to insert Email placeholder"
                        >
                          + Email
                        </button>
                      </div>
                    </div>
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
                    <div class="form-control">
                      <label class="label text-xs font-semibold py-1">Icon Style & Colors</label>
                      <select
                        class="select select-bordered select-sm w-full"
                        [(ngModel)]="block.socialIconStyle"
                        (ngModelChange)="updateBlocks()"
                      >
                        <option value="circular-solid">Circular Brand Color</option>
                        <option value="circular-gray">Circular Grayscale</option>
                        <option value="simple-color">Flat Brand Color</option>
                        <option value="simple-gray">Flat Grayscale</option>
                      </select>
                    </div>

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
                    <div class="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost text-[9px] py-0.5 px-1.5 h-auto min-h-0 text-base-content/70 hover:bg-base-200"
                        (click)="insertVariable(block, 'Company', 'footerCompany')"
                      >
                        + Company
                      </button>
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label text-xs font-semibold py-1">Address Info</label>
                    <textarea
                      class="textarea textarea-bordered w-full textarea-sm min-h-16"
                      [(ngModel)]="block.footerAddress"
                      (ngModelChange)="updateBlocks()"
                    ></textarea>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost text-[9px] py-0.5 px-1.5 h-auto min-h-0 text-base-content/70 hover:bg-base-200"
                        (click)="insertVariable(block, 'Company', 'footerAddress')"
                      >
                        + Company
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost text-[9px] py-0.5 px-1.5 h-auto min-h-0 text-base-content/70 hover:bg-base-200"
                        (click)="insertVariable(block, 'Phone', 'footerAddress')"
                      >
                        + Phone
                      </button>
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost text-[9px] py-0.5 px-1.5 h-auto min-h-0 text-base-content/70 hover:bg-base-200"
                        (click)="insertVariable(block, 'Email', 'footerAddress')"
                      >
                        + Email
                      </button>
                    </div>
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
  protected readonly activeTab = signal<'blocks' | 'edit'>('blocks');

  protected readonly socialSvgPaths = socialSvgPaths;
  protected getSocialBgColor(platform: string, style: string) {
    return getSocialBgColor(platform, style);
  }
  protected getSocialIconColor(platform: string, style: string) {
    return getSocialIconColor(platform, style);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  protected getMockVariableValue(name: string): string | undefined {
    const mocks: Record<string, string> = {
      FirstName: 'John',
      LastName: 'Doe',
      Email: 'john.doe@example.com',
      Company: 'Acme Corporation',
      JobTitle: 'Software Engineer',
      Phone: '(555) 123-4567',
    };
    const key = Object.keys(mocks).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? mocks[key] : undefined;
  }

  protected resolveVariablesForPreview(text: string | undefined, isButton = false): string {
    if (!text) return '';
    const escaped = this.escapeHtml(text);
    return escaped.replace(/\{([a-zA-Z0-9_]+)(?:\|([^}]+))?\}/g, (match, varName, fallback) => {
      const mockValue = this.getMockVariableValue(varName);
      const displayValue = mockValue !== undefined ? mockValue : (fallback !== undefined ? fallback : match);
      if (isButton) {
        return `<span class="border-b border-dashed border-current font-semibold" title="Variable: ${match}">${displayValue}</span>`;
      }
      return `<span class="border-b border-dashed border-primary/60 text-primary font-semibold animate-pulse" title="Variable: ${match}">${displayValue}</span>`;
    });
  }

  protected insertVariable(
    block: EmailBlock,
    variableName: string,
    field: 'content' | 'footerCompany' | 'footerAddress' = 'content',
  ): void {
    const placeholder = `{${variableName}}`;
    if (field === 'content') {
      block.content = (block.content || '') + placeholder;
    } else if (field === 'footerCompany') {
      block.footerCompany = (block.footerCompany || '') + placeholder;
    } else if (field === 'footerAddress') {
      block.footerAddress = (block.footerAddress || '') + placeholder;
    }
    this.updateBlocks();
  }

  // Computed signals
  protected readonly selectedBlock = computed(() => {
    const id = this.selectedBlockId();
    if (!id) return null;
    return this.blocks().find((b) => b.id === id) ?? null;
  });

  protected readonly compiledHtml = computed(() => {
    return compileBlocksToHtml(this.blocks());
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
      newBlock.socialIconStyle = 'circular-solid';
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
    const tpl = getTemplateBlocks(preset);
    this.blocks.set(tpl);
    this.selectedBlockId.set(tpl[0]?.id || null);
    this.activeTab.set('edit');

    if (triggerPropagate) {
      this.propagateChanges();
    }
  }

  private propagateChanges(): void {
    const html = this.compiledHtml();
    const text = compileBlocksToPlainText(this.blocks());

    this.htmlContentChange.emit(html);
    this.plainTextContentChange.emit(text);
  }
}
