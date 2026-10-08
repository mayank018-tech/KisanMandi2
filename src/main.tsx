import { Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { queryClient } from './lib/queryClient';

const RootWrapper = import.meta.env.DEV ? Fragment : StrictMode;

createRoot(document.getElementById('root')!).render(
  <RootWrapper>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </RootWrapper>
);
