interface ImportMetaEnv {
  // Named so it can be accessed with dot notation (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) — the
  // production build replaces that exact expression via esbuild `define` (project.json), and dot
  // access is what `define` matches. The index signature below still covers any other VITE_* key.
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly [key: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
