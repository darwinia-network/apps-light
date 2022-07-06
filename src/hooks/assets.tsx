import { useState, useCallback, useEffect } from 'react';
import { forkJoin, EMPTY } from 'rxjs';
import type { AccountData } from '@darwinia/types';
import { BN_ZERO } from '@polkadot/util';
import { useApi } from '../hooks';
import { SYSTEM_NETWORK_CONFIGURATIONS } from '../config';
import { Asset, DarwiniaAsset, Token, Network } from '../model';
import { getDarwiniaBalances } from '../utils';

const getToken = (tokens: Token[], network: Network, target: DarwiniaAsset, defaultToken: Token) => {
  const networkTokens = SYSTEM_NETWORK_CONFIGURATIONS.find((v) => v.name === network)?.tokens;
  const result = tokens.find((token) => networkTokens && token.symbol === networkTokens[target].symbol);

  return result || defaultToken;
};

export const useAssets = (account?: string | null) => {
  const { network, api, chain } = useApi();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([
    {
      max: 0,
      asset: DarwiniaAsset.ring,
      total: BN_ZERO,
      token: getToken(chain.tokens, network.name, DarwiniaAsset.ring, network.tokens.ring),
    },
    {
      max: 0,
      asset: DarwiniaAsset.kton,
      total: BN_ZERO,
      token: getToken(chain.tokens, network.name, DarwiniaAsset.kton, network.tokens.kton),
    },
  ]);

  const getAssets = useCallback(() => {
    if (!account || chain.ss58Format !== network.ss58Prefix.toString()) {
      setAssets([
        {
          max: 0,
          asset: DarwiniaAsset.ring,
          total: BN_ZERO,
          token: getToken(chain.tokens, network.name, DarwiniaAsset.ring, network.tokens.ring),
        },
        {
          max: 0,
          asset: DarwiniaAsset.kton,
          total: BN_ZERO,
          token: getToken(chain.tokens, network.name, DarwiniaAsset.kton, network.tokens.kton),
        },
      ]);
      return EMPTY.subscribe();
    }

    setLoading(true);

    return forkJoin([
      getDarwiniaBalances(api, account),
      api.query.system.account(account) as Promise<{ data: AccountData }>,
    ]).subscribe({
      next: ([
        [ring, kton],
        {
          data: { free, freeKton },
        },
      ]) => {
        setAssets([
          {
            max: ring,
            asset: DarwiniaAsset.ring,
            total: free,
            token: getToken(chain.tokens, network.name, DarwiniaAsset.ring, network.tokens.ring),
          },
          {
            max: kton,
            asset: DarwiniaAsset.kton,
            total: freeKton,
            token: getToken(chain.tokens, network.name, DarwiniaAsset.kton, network.tokens.kton),
          },
        ]);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
  }, [account, api, network, chain]);

  useEffect(() => {
    const sub$$ = getAssets();

    return () => {
      sub$$.unsubscribe();
      setLoading(false);
    };
  }, [getAssets]);

  return { assets, loading, refresh: getAssets };
};
