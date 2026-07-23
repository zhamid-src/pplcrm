export interface EmailBlock {
  id: string;
  type: 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'social';
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
  socialIconStyle?: 'circular-solid' | 'circular-gray' | 'simple-color' | 'simple-gray';
}

export const socialSvgPaths: Record<string, string> = {
  facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  twitter:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0.013-3.583 0.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  youtube:
    'M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
};

export function getSocialBgColor(platform: string, style: string): string {
  const s = style || 'circular-solid';
  if (s === 'circular-solid') {
    if (platform === 'facebook') return '#1877f2';
    if (platform === 'twitter') return '#000000';
    if (platform === 'linkedin') return '#0a66c2';
    if (platform === 'instagram') return '#e1306c';
    if (platform === 'youtube') return '#ff0000';
  }
  if (s === 'circular-gray') {
    return '#4b5563';
  }
  return 'transparent';
}

export function getSocialIconColor(platform: string, style: string): string {
  const s = style || 'circular-solid';
  if (s === 'circular-solid' || s === 'circular-gray') {
    return '#ffffff';
  }
  if (s === 'simple-color') {
    if (platform === 'facebook') return '#1877f2';
    if (platform === 'twitter') return '#000000';
    if (platform === 'linkedin') return '#0a66c2';
    if (platform === 'instagram') return '#e1306c';
    if (platform === 'youtube') return '#ff0000';
  }
  return '#4b5563';
}

export function compileTemplateHtml(preset: 'welcome' | 'product' | 'newsletter' | 'empty'): string {
  const blockList = getTemplateBlocks(preset);
  return compileBlocksToHtml(blockList);
}

export function compileTemplatePlainText(preset: 'welcome' | 'product' | 'newsletter' | 'empty'): string {
  const blockList = getTemplateBlocks(preset);
  return compileBlocksToPlainText(blockList);
}

export function getTemplateBlocks(preset: 'welcome' | 'product' | 'newsletter' | 'empty'): EmailBlock[] {
  if (preset === 'welcome') {
    return [
      {
        id: 'w1',
        type: 'spacer',
        styles: { height: '20' },
      },
      {
        id: 'w2',
        type: 'heading',
        content: 'WELCOME TO OUR COMMUNITY!',
        styles: { textAlign: 'center', fontSize: '28px', color: '#1f2937', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'w3',
        type: 'image',
        imageUrl: 'assets/newsletters/welcome_banner.png',
        imageAlt: 'Waving team welcome banner',
        imageWidth: '100%',
        styles: { textAlign: 'center', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'w4',
        type: 'text',
        content:
          "Hello [User Name]!\n\nYou've successfully joined a vibrant network of professionals, innovators, and creators! This email marks the beginning of your exciting journey with us.\n\nExplore exclusive content, connect with experts, access resources, and discover a world of opportunities designed to accelerate your growth.\n\nWe are here to support you every step of the way. Let's make an impact together!",
        styles: { textAlign: 'left', fontSize: '16px', color: '#4b5563', paddingTop: '15', paddingBottom: '15' },
      },
      {
        id: 'w5',
        type: 'button',
        content: 'GET STARTED NOW',
        linkUrl: 'https://example.com/start',
        styles: {
          textAlign: 'center',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          borderRadius: '6',
          fontSize: '16px',
          paddingTop: '15',
          paddingBottom: '15',
        },
      },
      {
        id: 'w6',
        type: 'divider',
        styles: { borderColor: '#e5e7eb', borderWidth: '1', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'w7',
        type: 'social',
        socialIconStyle: 'circular-solid',
        socials: [
          { platform: 'facebook', url: 'https://facebook.com' },
          { platform: 'twitter', url: 'https://twitter.com' },
          { platform: 'linkedin', url: 'https://linkedin.com' },
          { platform: 'instagram', url: 'https://instagram.com' },
        ],
        styles: { textAlign: 'center', paddingTop: '10', paddingBottom: '10' },
      },
    ];
  } else if (preset === 'product') {
    return [
      {
        id: 'p1',
        type: 'spacer',
        styles: { height: '15' },
      },
      {
        id: 'p2',
        type: 'heading',
        content: 'Introducing Visual Newsletters!',
        styles: { textAlign: 'center', fontSize: '32px', color: '#111827', paddingTop: '10', paddingBottom: '5' },
      },
      {
        id: 'p3',
        type: 'image',
        imageUrl: 'assets/newsletters/product_banner.png',
        imageAlt: 'Visual builder rocket announcement',
        imageWidth: '100%',
        styles: { textAlign: 'center', paddingTop: '15', paddingBottom: '15' },
      },
      {
        id: 'p4',
        type: 'text',
        content:
          'The easiest way to create and send stunning emails for your business.\n\n✨ Create engaging content with ease\n📊 Built-in analytics dashboard\n👥 Collaborative team features\n✅ One-click publishing & sending',
        styles: { textAlign: 'left', fontSize: '16px', color: '#374151', paddingTop: '10', paddingBottom: '15' },
      },
      {
        id: 'p5',
        type: 'button',
        content: 'Try Visual Builder',
        linkUrl: 'https://example.com/dashboard/newsletters',
        styles: {
          textAlign: 'center',
          backgroundColor: '#10b981',
          color: '#ffffff',
          borderRadius: '6',
          fontSize: '16px',
          paddingTop: '15',
          paddingBottom: '15',
        },
      },
    ];
  } else if (preset === 'newsletter') {
    return [
      {
        id: 'n1',
        type: 'heading',
        content: 'WEEKLY DIGEST',
        styles: { textAlign: 'center', fontSize: '28px', color: '#111827', paddingTop: '15', paddingBottom: '5' },
      },
      {
        id: 'n2',
        type: 'divider',
        styles: { borderColor: '#111827', borderWidth: '2', paddingTop: '5', paddingBottom: '15' },
      },
      {
        id: 'n3-h1',
        type: 'heading',
        content: 'Article 1 Headline: Weekly News',
        styles: { textAlign: 'left', fontSize: '18px', color: '#111827', paddingTop: '10', paddingBottom: '5' },
      },
      {
        id: 'n3-t1',
        type: 'text',
        content:
          'Here is what is happening around the platform this week. List Sync has been updated to support faster exports for all user accounts.',
        styles: { textAlign: 'left', fontSize: '15px', color: '#374151', paddingTop: '5', paddingBottom: '10' },
      },
      {
        id: 'n3-d1',
        type: 'divider',
        styles: { borderColor: '#e5e7eb', borderWidth: '1', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'n3-h2',
        type: 'heading',
        content: 'Article 2: Key Insights & Trends',
        styles: { textAlign: 'left', fontSize: '18px', color: '#111827', paddingTop: '10', paddingBottom: '5' },
      },
      {
        id: 'n3-t2',
        type: 'text',
        content:
          'Household reassignment logic fixes are now live and performing seamlessly under high concurrent load tests.',
        styles: { textAlign: 'left', fontSize: '15px', color: '#374151', paddingTop: '5', paddingBottom: '10' },
      },
      {
        id: 'n3-d2',
        type: 'divider',
        styles: { borderColor: '#e5e7eb', borderWidth: '1', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'n3-h3',
        type: 'heading',
        content: 'Article 3: Tech Innovation Focus',
        styles: { textAlign: 'left', fontSize: '18px', color: '#111827', paddingTop: '10', paddingBottom: '5' },
      },
      {
        id: 'n3-t3',
        type: 'text',
        content:
          'Security and role access controls have been strengthened across all internal modules and database tables.',
        styles: { textAlign: 'left', fontSize: '15px', color: '#374151', paddingTop: '5', paddingBottom: '10' },
      },
      {
        id: 'n3-d3',
        type: 'divider',
        styles: { borderColor: '#e5e7eb', borderWidth: '1', paddingTop: '10', paddingBottom: '10' },
      },
      {
        id: 'n3-soc',
        type: 'social',
        socialIconStyle: 'circular-solid',
        socials: [
          { platform: 'facebook', url: 'https://facebook.com' },
          { platform: 'twitter', url: 'https://twitter.com' },
          { platform: 'linkedin', url: 'https://linkedin.com' },
        ],
        styles: { textAlign: 'center', paddingTop: '10', paddingBottom: '10' },
      },
    ];
  } else {
    return [
      {
        id: 'e1',
        type: 'heading',
        content: 'Start Designing Your Newsletter',
        styles: { textAlign: 'center', fontSize: '24px', color: '#1f2937', paddingTop: '20', paddingBottom: '20' },
      },
    ];
  }
}

export function compileBlocksToHtml(blockList: EmailBlock[]): string {
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
      const imgUrl =
        block.imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=600&q=80';
      const imgAlt = block.imageAlt || 'Image';
      const imgWidth = block.imageWidth || '100%';
      const maxWStyle = imgWidth.endsWith('%')
        ? `width: ${imgWidth}; max-width: 100%;`
        : `width: 100%; max-width: ${imgWidth};`;

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
      const style = block.socialIconStyle || 'circular-solid';
      for (const social of block.socials || []) {
        const char = social.platform.charAt(0).toUpperCase();
        const svgPath = socialSvgPaths[social.platform] || '';
        const bgColor = getSocialBgColor(social.platform, style);
        const iconColor = getSocialIconColor(social.platform, style);
        const r = style.startsWith('circular') ? '50%' : '0%';

        tdSocials += `
          <td style="padding: 0 8px;" align="center" valign="middle">
            <a href="${social.url || '#'}" target="_blank" style="text-decoration: none; display: block; width: 32px; height: 32px; background-color: ${bgColor}; border-radius: ${r}; line-height: 32px; text-align: center; color: ${iconColor};">
              <!--[if !mso]><!-->
              <svg viewBox="0 0 24 24" width="16" height="16" fill="${iconColor}" style="display: inline-block; vertical-align: middle; width: 16px; height: 16px; margin-top: 8px;">
                <path d="${svgPath}"></path>
              </svg>
              <!--<![endif]-->
              <!--[if mso]>
              <span style="color: ${iconColor}; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px;">${char}</span>
              <![endif]-->
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
    }
  }

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

export function compileBlocksToPlainText(blockList: EmailBlock[]): string {
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
    }
  }

  return text.trim();
}
