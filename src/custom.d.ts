declare module '@supabase/supabase-js' {
  export type User = any;
  export type Session = any;
  export function createClient<T = any>(url: string, key: string): any;
  export const SupabaseClient: any;
  export default any;
}

declare module '*.css';
