import { createContext, useContext } from 'react';
import type { AccountUser } from './api';
import type { SaveStatus } from './workspace';
export type AccountSession = {
  user: AccountUser;
  status: SaveStatus;
  logout: () => Promise<void>;
  retrySave: () => Promise<void>;
  busy: boolean;
};
export const AccountContext = createContext<AccountSession | null>(null);
export const useAccountSession = () => useContext(AccountContext);
