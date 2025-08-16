/****************************************************** */
/*
/* Look at https://heroicons.com for icons. Most of these
/* are from the Heroicons set, some are custom.
/*
/****************************************************** */
export type PcIconNameType = keyof typeof icons;

export async function loadIconSvg(name: PcIconNameType): Promise<string> {
  if (!_cache.has(name)) {
    _cache.set(
      name,
      fetch(icons[name])
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch ${name}`);
          return r.text();
        })
        .catch(async () => {
          // last-resort: fetch the unknown icon (cached too)
          if (!_cache.has(UNKNOWN)) {
            _cache.set(
              UNKNOWN,
              fetch(icons[UNKNOWN]).then((r) => r.text()),
            );
          }
          return _cache.get(UNKNOWN)!;
        }),
    );
  }
  return _cache.get(name)!;
}

const UNKNOWN: PcIconNameType = 'unknown';

/** Optional: load SVG text when you need to inline it (works with Tailwind/DaisyUI) */
const _cache = new Map<PcIconNameType, Promise<string>>();

export const icons = {
  unknown: 'assets/icons/unknown.svg',
  /* -------------------- User & People -------------------- */
  'user-plus': 'assets/icons/user-plus.svg',
  'user-circle': 'assets/icons/user-circle.svg',
  'user-group': 'assets/icons/user-group.svg',
  users: 'assets/icons/users.svg',

  /* -------------------- Navigation & Arrows -------------------- */
  'arrow-down-tray': 'assets/icons/arrow-down-tray.svg',
  'arrow-left-start-on-rectangle': 'assets/icons/arrow-left-start-on-rectangle.svg',
  'arrow-path': 'assets/icons/arrow-path.svg',
  'arrows-pointing-out': 'assets/icons/arrows-pointing-out.svg',
  'arrows-pointing-in': 'assets/icons/arrows-pointing-in.svg',
  'arrow-right-end-on-rectangle': 'assets/icons/arrow-right-end-on-rectangle.svg',
  'arrow-right-start-on-rectangle': 'assets/icons/arrow-right-start-on-rectangle.svg',
  'arrow-top-right-on-square': 'assets/icons/arrow-top-right-on-square.svg',
  'arrow-up-tray': 'assets/icons/arrow-up-tray.svg',
  'arrow-uturn-left': 'assets/icons/arrow-uturn-left.svg',
  'arrow-uturn-right': 'assets/icons/arrow-uturn-right.svg',
  'chevron-double-left': 'assets/icons/chevron-double-left.svg',
  'chevron-double-right': 'assets/icons/chevron-double-right.svg',
  'chevron-up': 'assets/icons/chevron-up.svg',
  'chevron-down': 'assets/icons/chevron-down.svg',
  'reply-all': 'assets/icons/reply-all.svg',
  reply: 'assets/icons/reply.svg',

  /* -------------------- Status & Alerts -------------------- */
  'check-circle': 'assets/icons/check-circle.svg',
  'exclamation-circle': 'assets/icons/exclamation-circle.svg',
  'exclamation-triangle': 'assets/icons/exclamation-triangle.svg',
  'information-circle': 'assets/icons/information-circle.svg',
  star: 'assets/icons/star.svg',
  'star-filled': 'assets/icons/star-filled.svg',
  'x-circle': 'assets/icons/x-circle.svg',
  'x-mark': 'assets/icons/x-mark.svg',

  /* -------------------- UI Controls -------------------- */
  'bars-3': 'assets/icons/bars-3.svg',
  'bars-4': 'assets/icons/bars-4.svg',
  bell: 'assets/icons/bell.svg',
  'clipboard-document-list': 'assets/icons/clipboard-document-list.svg',
  'cog-6-tooth': 'assets/icons/cog-6-tooth.svg',
  'ellipsis-vertical': 'assets/icons/ellipsis-vertical.svg',
  funnel: 'assets/icons/funnel.svg',
  filter: 'assets/icons/funnel.svg',
  'magnifying-glass': 'assets/icons/magnifying-glass.svg',
  'pencil-square': 'assets/icons/pencil-square.svg',
  plus: 'assets/icons/plus.svg',
  'queue-list': 'assets/icons/queue-list.svg',
  tag: 'assets/icons/tag.svg',
  trash: 'assets/icons/trash.svg',

  /* -------------------- Commerce & Finance -------------------- */
  banknotes: 'assets/icons/banknotes.svg',
  'credit-card': 'assets/icons/credit-card.svg',
  'currency-dollar': 'assets/icons/currency-dollar.svg',
  briefcase: 'assets/icons/briefcase.svg',

  /* -------------------- Communication -------------------- */
  'at-symbol': 'assets/icons/at-symbol.svg',
  envelope: 'assets/icons/envelope.svg',
  'inbox-stack': 'assets/icons/inbox-stack.svg',
  inbox: 'assets/icons/inbox.svg',
  megaphone: 'assets/icons/megaphone.svg',
  'paper-airplane': 'assets/icons/paper-airplane.svg',
  'paper-clip': 'assets/icons/paper-clip.svg',
  document: 'assets/icons/document.svg',
  'document-check': 'assets/icons/document-check.svg',
  'document-duplicate': 'assets/icons/document-duplicate.svg',
  print: 'assets/icons/print.svg',

  /* -------------------- Time & Date -------------------- */
  clock: 'assets/icons/clock.svg',

  /* -------------------- Home, Places & Maps -------------------- */
  home: 'assets/icons/home.svg',
  'house-modern': 'assets/icons/house-modern.svg',
  map: 'assets/icons/map.svg',
  'map-pin': 'assets/icons/map-pin.svg',

  /* -------------------- System & Settings -------------------- */
  'cloud-arrow-up': 'assets/icons/cloud-arrow-up.svg',
  'lock-closed': 'assets/icons/lock-closed.svg',
  'presentation-chart-line': 'assets/icons/presentation-chart-line.svg',

  /* -------------------- FILE ICONS ----------------------- */
  'file-pdf': 'assets/icons/file-pdf.svg',
  'file-doc': 'assets/icons/file-doc.svg',
  'file-sheet': 'assets/icons/file-sheet.svg',
  'file-slides': 'assets/icons/file-slides.svg',
  'file-text': 'assets/icons/file-text.svg',
  'file-image': 'assets/icons/file-image.svg',
  'file-audio': 'assets/icons/file-audio.svg',
  'file-video': 'assets/icons/file-video.svg',
  'file-archive': 'assets/icons/file-archive.svg',
  'file-code': 'assets/icons/file-code.svg',
  'file-design': 'assets/icons/file-design.svg',
  'file-font': 'assets/icons/file-font.svg',
  'file-ebook': 'assets/icons/file-ebook.svg',
  'file-email': 'assets/icons/file-email.svg',
  'file-calendar': 'assets/icons/file-calendar.svg',
  'file-contact': 'assets/icons/file-contact.svg',
  'file-db': 'assets/icons/file-db.svg',
  'file-disk': 'assets/icons/file-disk.svg',
  'file-exe': 'assets/icons/file-exe.svg',
  file: 'assets/icons/file.svg',

  /* -------------------- Misc -------------------- */
  'chart-pie': 'assets/icons/chart-pie.svg',
  'globe-americas': 'assets/icons/globe-americas.svg',
  hashtag: 'assets/icons/hashtag.svg',
  identification: 'assets/icons/identification.svg',
  'rectangle-stack': 'assets/icons/rectangle-stack.svg',
  'square-3-stack-3d': 'assets/icons/square-3-stack-3d.svg',
  sun: 'assets/icons/sun.svg',
  moon: 'assets/icons/moon.svg',
  eye: 'assets/icons/eye.svg',
  'eye-slash': 'assets/icons/eye-slash.svg',
} as const;
