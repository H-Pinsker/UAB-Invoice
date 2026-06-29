/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  // Corporate customer details for the Quartierbestätigung form (build-time).
  readonly VITE_EUROWORK_COMPANY_NAME?: string;
  readonly VITE_EUROWORK_COMPANY_ADDRESS?: string;
  readonly VITE_EUROWORK_COMPANY_PHONE?: string;
  readonly VITE_EUROWORK_COMPANY_EMAIL?: string;
  readonly VITE_EUROWORK_COMPANY_BETREUER?: string;
  readonly VITE_EUROWORK_FOOTER_COMPANY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
