// Provider factory — returns the correct implementation based on config.
// Import this in server-side code only (route handlers, server components).
// API keys never leave the server.

import { getProviderConfig } from '@/lib/config';
import type { CricketProvider } from './base';
import { CricketDataProvider } from './cricketdata';
import { EntitySportProvider } from './entitysport';
import { SportmonksProvider } from './sportmonks';
import { FreeWebAPIProvider } from './freewebapi';
import { CricbuzzProvider } from './cricbuzz';
import { RoanuzProvider } from './roanuz';
import { MockProvider } from './mock';

export { type CricketProvider };

let _provider: CricketProvider | null = null;

/**
 * Returns a singleton provider instance for the current process.
 * Falls back to MockProvider if the requested provider's credentials are missing.
 */
export function getProvider(): CricketProvider {
  if (_provider) return _provider;

  const cfg = getProviderConfig();

  switch (cfg.name) {
    case 'cricketdata':
      if (!cfg.cricketdata.apiKey) {
        console.warn('[PlayMarkets] CRICKETDATA_API_KEY not set — falling back to mock provider');
        _provider = new MockProvider();
      } else {
        _provider = new CricketDataProvider(cfg.cricketdata.apiKey, cfg.cricketdata.baseUrl);
      }
      break;

    case 'entitysport':
      _provider = new EntitySportProvider(cfg.entitysport.token, cfg.entitysport.baseUrl);
      break;

    case 'sportmonks':
      if (!cfg.sportmonks.token) {
        console.warn('[PlayMarkets] SPORTMONKS_API_TOKEN not set — falling back to mock provider');
        _provider = new MockProvider();
      } else {
        _provider = new SportmonksProvider(cfg.sportmonks.token, cfg.sportmonks.baseUrl);
      }
      break;

    case 'freewebapi':
      if (!cfg.freewebapi.rapidApiKey) {
        console.warn('[PlayMarkets] RAPIDAPI_KEY not set — falling back to mock provider');
        _provider = new MockProvider();
      } else {
        _provider = new FreeWebAPIProvider(cfg.freewebapi.rapidApiKey, cfg.freewebapi.baseUrl);
      }
      break;

    case 'cricbuzz':
      if (!cfg.cricbuzz.rapidApiKey) {
        console.warn('[PlayMarkets] RAPIDAPI_KEY not set — falling back to mock provider');
        _provider = new MockProvider();
      } else {
        _provider = new CricbuzzProvider(cfg.cricbuzz.rapidApiKey, cfg.cricbuzz.baseUrl);
      }
      break;

    case 'roanuz':
      if (!cfg.roanuz.apiKey) {
        console.warn('[PlayMarkets] ROANUZ_API_KEY not set — falling back to mock provider');
        _provider = new MockProvider();
      } else {
        _provider = new RoanuzProvider(cfg.roanuz.apiKey, cfg.roanuz.projectKey, cfg.roanuz.baseUrl);
      }
      break;

    case 'mock':
    default:
      _provider = new MockProvider();
      break;
  }

  console.info(`[PlayMarkets] Using provider: ${_provider.name}`);
  return _provider;
}
