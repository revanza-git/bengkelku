// Stub Supabase client for builds that reference the legacy path.
// The frontend no longer depends on Supabase directly, but some components
// may still import this module. Keeping a lightweight export avoids
// Vite resolution errors without adding the supabase-js dependency.

export const supabase: null = null;
