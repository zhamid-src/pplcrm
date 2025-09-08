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
  'add-home': 'assets/icons/add-home.svg',
  'add-list': 'assets/icons/add-list.svg',
  'archive-box': 'assets/icons/archive-box.svg',
  'archive-box-arrow-down': 'assets/icons/archive-box-arrow-down.svg',
  'arrow-down-tray': 'assets/icons/arrow-down-tray.svg',
  'arrow-left-start-on-rectangle': 'assets/icons/arrow-left-start-on-rectangle.svg',
  'arrow-path': 'assets/icons/arrow-path.svg',
  'arrow-right-end-on-rectangle': 'assets/icons/arrow-right-end-on-rectangle.svg',
  'arrow-right-start-on-rectangle': 'assets/icons/arrow-right-start-on-rectangle.svg',
  'arrow-top-right-on-square': 'assets/icons/arrow-top-right-on-square.svg',
  'arrow-up-tray': 'assets/icons/arrow-up-tray.svg',
  'arrow-uturn-left': 'assets/icons/arrow-uturn-left.svg',
  'arrow-uturn-right': 'assets/icons/arrow-uturn-right.svg',
  'arrows-pointing-in': 'assets/icons/arrows-pointing-in.svg',
  'arrows-pointing-out': 'assets/icons/arrows-pointing-out.svg',
  'at-symbol': 'assets/icons/at-symbol.svg',
  'attach-fat': 'assets/icons/attach-fat.svg',
  'attach-file-off': 'assets/icons/attach-file-off.svg',
  banknotes: 'assets/icons/banknotes.svg',
  'bars-3': 'assets/icons/bars-3.svg',
  'bars-4': 'assets/icons/bars-4.svg',
  bell: 'assets/icons/bell.svg',
  briefcase: 'assets/icons/briefcase.svg',
  'chart-pie': 'assets/icons/chart-pie.svg',
  'check-circle': 'assets/icons/check-circle.svg',
  'chevron-double-left': 'assets/icons/chevron-double-left.svg',
  'chevron-double-right': 'assets/icons/chevron-double-right.svg',
  'chevron-down': 'assets/icons/chevron-down.svg',
  'chevron-left': 'assets/icons/chevron-left.svg',
  'chevron-right': 'assets/icons/chevron-right.svg',
  'chevron-up': 'assets/icons/chevron-up.svg',
  'clipboard-document-list': 'assets/icons/clipboard-document-list.svg',
  clock: 'assets/icons/clock.svg',
  'cloud-arrow-up': 'assets/icons/cloud-arrow-up.svg',
  'cog-6-tooth': 'assets/icons/cog-6-tooth.svg',
  'collapse-content': 'assets/icons/collapse-content.svg',
  'credit-card': 'assets/icons/credit-card.svg',
  'currency-dollar': 'assets/icons/currency-dollar.svg',
  document: 'assets/icons/document.svg',
  'document-check': 'assets/icons/document-check.svg',
  'document-duplicate': 'assets/icons/document-duplicate.svg',
  'document-text': 'assets/icons/document-text.svg',
  'ellipsis-vertical': 'assets/icons/ellipsis-vertical.svg',
  envelope: 'assets/icons/envelope.svg',
  'exclamation-circle': 'assets/icons/exclamation-circle.svg',
  'exclamation-triangle': 'assets/icons/exclamation-triangle.svg',
  'expand-content': 'assets/icons/expand-content.svg',
  eye: 'assets/icons/eye.svg',
  'eye-slash': 'assets/icons/eye-slash.svg',
  file: 'assets/icons/file.svg',
  'file-archive': 'assets/icons/file-archive.svg',
  'file-audio': 'assets/icons/file-audio.svg',
  'file-calendar': 'assets/icons/file-calendar.svg',
  'file-code': 'assets/icons/file-code.svg',
  'file-contact': 'assets/icons/file-contact.svg',
  'file-db': 'assets/icons/file-db.svg',
  'file-design': 'assets/icons/file-design.svg',
  'file-disk': 'assets/icons/file-disk.svg',
  'file-doc': 'assets/icons/file-doc.svg',
  'file-ebook': 'assets/icons/file-ebook.svg',
  'file-email': 'assets/icons/file-email.svg',
  'file-exe': 'assets/icons/file-exe.svg',
  'file-font': 'assets/icons/file-font.svg',
  'file-image': 'assets/icons/file-image.svg',
  'file-pdf': 'assets/icons/file-pdf.svg',
  'file-sheet': 'assets/icons/file-sheet.svg',
  'file-slides': 'assets/icons/file-slides.svg',
  'file-text': 'assets/icons/file-text.svg',
  'file-video': 'assets/icons/file-video.svg',
  filter: 'assets/icons/funnel.svg',
  funnel: 'assets/icons/funnel.svg',
  'globe-americas': 'assets/icons/globe-americas.svg',
  hashtag: 'assets/icons/hashtag.svg',
  home: 'assets/icons/home.svg',
  'house-modern': 'assets/icons/house-modern.svg',
  identification: 'assets/icons/identification.svg',
  inbox: 'assets/icons/inbox.svg',
  'inbox-stack': 'assets/icons/inbox-stack.svg',
  'information-circle': 'assets/icons/information-circle.svg',
  'lock-closed': 'assets/icons/lock-closed.svg',
  loading: 'assets/icons/loading.svg',
  'magnifying-glass': 'assets/icons/magnifying-glass.svg',
  map: 'assets/icons/map.svg',
  'map-pin': 'assets/icons/map-pin.svg',
  megaphone: 'assets/icons/megaphone.svg',
  merge: 'assets/icons/merge.svg',
  moon: 'assets/icons/moon.svg',
  'paper-airplane': 'assets/icons/paper-airplane.svg',
  'paper-clip': 'assets/icons/paper-clip.svg',
  'pencil-square': 'assets/icons/pencil-square.svg',
  plus: 'assets/icons/plus.svg',
  'presentation-chart-line': 'assets/icons/presentation-chart-line.svg',
  print: 'assets/icons/print.svg',
  'queue-list': 'assets/icons/queue-list.svg',
  'rectangle-stack': 'assets/icons/rectangle-stack.svg',
  'redo-fat': 'assets/icons/redo-fat.svg',
  reply: 'assets/icons/reply.svg',
  'reply-all': 'assets/icons/reply-all.svg',
  'restore-from-trash': 'assets/icons/restore-from-trash.svg',
  save: 'assets/icons/save.svg',
  'square-3-stack-3d': 'assets/icons/square-3-stack-3d.svg',
  star: 'assets/icons/star.svg',
  'star-filled': 'assets/icons/star-filled.svg',
  sun: 'assets/icons/sun.svg',
  'table-cells': 'assets/icons/table-cells.svg',
  tag: 'assets/icons/tag.svg',
  trash: 'assets/icons/trash.svg',
  'trash-forever': 'assets/icons/trash-forever.svg',
  'undo-fat': 'assets/icons/undo-fat.svg',
  unknown: 'assets/icons/unknown.svg',
  'user-circle': 'assets/icons/user-circle.svg',
  'user-group': 'assets/icons/user-group.svg',
  'user-plus': 'assets/icons/user-plus.svg',
  users: 'assets/icons/users.svg',
  'view-column': 'assets/icons/view-column.svg',
  'view-kanban': 'assets/icons/view-kanban.svg',
  volunteer: 'assets/icons/volunteer.svg',
  'x-circle': 'assets/icons/x-circle.svg',
  'x-mark': 'assets/icons/x-mark.svg',
} as const;
