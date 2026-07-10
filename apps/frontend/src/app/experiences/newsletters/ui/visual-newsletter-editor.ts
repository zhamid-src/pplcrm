import { Component, OnInit, computed, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';
import { TabBar, type PcTabOption } from '@uxcommon/components/tabs/tabs';

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
  selector: 'pc-visual-newsletter-editor',
  imports: [FormsModule, Icon, TabBar],
  templateUrl: './visual-newsletter-editor.html',
})
export class VisualNewsletterEditorComponent implements OnInit {
  public readonly htmlContent = model<string>('');
  public readonly plainTextContent = model<string>('');

  protected readonly blocks = signal<EmailBlock[]>([]);
  protected readonly selectedBlockId = signal<string | null>(null);
  protected readonly previewMode = signal<'desktop' | 'mobile'>('desktop');
  protected readonly editorMode = signal<'visual' | 'code'>('visual');
  protected readonly activeTab = signal<'blocks' | 'edit'>('blocks');

  protected readonly panelTabs: PcTabOption[] = [
    { id: 'blocks', label: 'Blocks' },
    { id: 'edit', label: 'Customize' },
  ];

  protected setPanelTab(tab: string): void {
    if (tab === 'blocks' || tab === 'edit') this.activeTab.set(tab);
  }

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
      const displayValue = mockValue !== undefined ? mockValue : fallback !== undefined ? fallback : match;
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
    const matched = this.htmlContent().match(/<!-- PPLCRM_VISUAL_BLOCKS_DATA: ([\s\S]*?) -->/);
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
    if (this.htmlContent() && this.htmlContent().trim().length > 100) {
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

  protected addBlock(type: 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social' | 'footer'): void {
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
      this.selectedBlockId.set(filtered.length > 0 ? filtered[0]!.id : null);
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
    const temp = list[idx]!;
    list[idx] = list[idx - 1]!;
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
    const temp = list[idx]!;
    list[idx] = list[idx + 1]!;
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
    this.htmlContent.set(html);
    // Simple text version conversion from html tags
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    this.plainTextContent.set(text);
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

    this.htmlContent.set(html);
    this.plainTextContent.set(text);
  }
}
