// Provider configuration — driven entirely by environment variables.
// Change CRICKET_PROVIDER in .env.local to switch providers without code changes.

export type ProviderName =
  | 'cricketdata'
  | 'entitysport'
  | 'sportmonks'
  | 'freewebapi'
  | 'cricbuzz'
  | 'roanuz'
  | 'mock';

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
  sportmonks: {
    token: string;
    baseUrl: string;
  };
  freewebapi: {
    rapidApiKey: string;
    baseUrl: string;
  };
  cricbuzz: {
    rapidApiKey: string;
    baseUrl: string;
  };
  roanuz: {
    apiKey: string;
    projectKey: string;
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

    sportmonks: {
      token: process.env.SPORTMONKS_API_TOKEN ?? '',
      baseUrl: 'https://cricket.sportmonks.com/api/v2.0',
    },

    freewebapi: {
      rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
      baseUrl: 'https://unofficial-cricbuzz.p.rapidapi.com',
    },

    cricbuzz: {
      rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
      baseUrl: 'https://cricbuzz-cricket.p.rapidapi.com',
    },

    roanuz: {
      apiKey: process.env.ROANUZ_API_KEY ?? '',
      projectKey: process.env.ROANUZ_PROJECT_KEY ?? 'dev_season_2014',
      baseUrl: 'https://api.sports.roanuz.com/v5',
    },
  };
}
