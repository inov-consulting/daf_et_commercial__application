"use client"

import { Provider } from 'react-redux';
import { store, persistor } from '../store';
import { PersistGate } from 'redux-persist/integration/react';
import { ApiContextSync } from '@/components/providers/ApiContextSync';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ApiContextSync />
        {children}
      </PersistGate>
    </Provider>
  );
}