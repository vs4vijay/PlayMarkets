// Provider configuration — driven entirely by environment variables.
// Change CRICKET_PROVIDER in .env.local to switch providers without code changes.

export type ProviderName = 'cricketdata' | 'entitysport' | 'mock';

export interface ProviderConfig {
  name: ProviderName;
  cricketdata: {
    apiKey: string;
    baseUrl: string;
  };
  entitysport: {
    token: string;
    baseUrl: string;
  };
}

export function getProviderConfig(): ProviderConfig {
  return {
    name: (process.env.CRICKET_PROVIDER as ProviderName) ?? 'mock',
    cricketdata: {
      apiKey: process.env.CRICKETDATA_API_KEY ?? '',
      baseUrl: 'https://api.cricapi.com/v1',
    },
    entitysport: {
      token: process.env.ENTITYSPORT_TOKEN ?? 'ec471071441bb2ac538a0ff901abd249',
      baseUrl: 'https://restapi.entitysport.com/v2',
    },
  };
}
