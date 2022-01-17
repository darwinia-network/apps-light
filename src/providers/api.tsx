import { ApiPromise } from '@polkadot/api';
import { createContext, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { EMPTY, Subscription } from 'rxjs';
import { darwiniaConfig } from '../config';
import {
  Action,
  Chain,
  ChainConfig,
  Connection,
  ConnectionStatus,
  PolkadotChainConfig,
  PolkadotConnection,
} from '../model';
import { getPolkadotConnection, waitUntilConnected } from '../utils';

interface StoreState {
  connection: Connection;
  network: PolkadotChainConfig;
  isDev: boolean;
}

type ActionType = 'setNetwork' | 'setConnection';

const isDev = process.env.REACT_APP_HOST_TYPE === 'dev';

const initialConnection: Connection = {
  status: ConnectionStatus.pending,
  type: 'unknown',
  accounts: [],
  chainId: '',
};

const initialState: StoreState = {
  connection: initialConnection,
  network: darwiniaConfig,
  isDev,
};

// eslint-disable-next-line complexity, @typescript-eslint/no-explicit-any
function accountReducer(state: StoreState, action: Action<ActionType, any>): StoreState {
  switch (action.type) {
    case 'setNetwork': {
      return { ...state, network: action.payload };
    }

    case 'setConnection': {
      return { ...state, connection: action.payload };
    }

    default:
      return state;
  }
}

export type ApiCtx = StoreState & {
  api: ApiPromise | null;
  connectNetwork: (network: ChainConfig) => void;
  disconnect: () => void;
  setNetwork: (network: ChainConfig) => void;
  setApi: (api: ApiPromise) => void;
  chain: Chain;
};

export const ApiContext = createContext<ApiCtx | null>(null);

let subscription: Subscription = EMPTY.subscribe();

export const ApiProvider = ({ children }: React.PropsWithChildren<unknown>) => {
  const [state, dispatch] = useReducer(accountReducer, initialState);
  const setNetwork = useCallback((payload: ChainConfig) => dispatch({ type: 'setNetwork', payload }), []);
  const setConnection = useCallback((payload: Connection) => dispatch({ type: 'setConnection', payload }), []);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [chain, setChain] = useState<Chain>({ ss58Format: '', tokens: [] });
  const observer = useMemo(
    () => ({
      next: (connection: Connection) => {
        setConnection(connection);

        const nApi = (connection as PolkadotConnection).api;

        if (nApi) {
          nApi?.isReady.then(() => {
            setApi(nApi);
          });
        }
      },
      error: (err: unknown) => {
        setConnection({ status: ConnectionStatus.error, accounts: [], type: 'unknown', api: null });
        console.error('%c connection error ', 'font-size:13px; background:pink; color:#bf2c9f;', err);
      },
      complete: () => {
        console.info('Connection life is over');
      },
    }),
    [setConnection]
  );
  const connectNetwork = useCallback(
    (config: ChainConfig) => {
      subscription.unsubscribe();

      setNetwork(config);
      subscription = getPolkadotConnection(config).subscribe(observer);
    },
    [observer, setNetwork]
  );

  // eslint-disable-next-line complexity
  const disconnect = useCallback(() => {
    subscription.unsubscribe();

    setConnection(initialConnection);
    setApi(null);
  }, [setConnection]);

  useEffect(() => {
    if (!state.network) {
      setConnection(initialConnection);
    } else {
      subscription = getPolkadotConnection(state.network).subscribe(observer);
    }

    return () => {
      console.info('[Api provider] Cancel network subscription of network', state.network?.name);
      subscription.unsubscribe();
    };
  }, [observer, setConnection, state.network]);

  useEffect(() => {
    if (!api) {
      return;
    }

    (async () => {
      await waitUntilConnected(api);

      const chainState = await api?.rpc.system.properties();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { tokenDecimals, tokenSymbol, ss58Format } = chainState?.toHuman() as any;
      const chainInfo = tokenDecimals.reduce(
        (acc: Chain, decimal: string, index: number) => {
          const token = { decimal, symbol: tokenSymbol[index] };

          return { ...acc, tokens: [...acc.tokens, token] };
        },
        { ss58Format, tokens: [] } as Chain
      );

      setChain(chainInfo);
    })();
  }, [api]);

  return (
    <ApiContext.Provider
      value={{
        ...state,
        connectNetwork,
        disconnect,
        setNetwork,
        setApi,
        api,
        chain,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};