'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useState, type ReactNode } from 'react';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spirom.shop';

// WalletConnect Cloud projectIdがない場合はダミー値を使用
// （MetaMaskなど injected wallets は projectId なしでも動作する）
const config = getDefaultConfig({
  appName: 'Spirom',
  appDescription: 'Spirom - Premium T-shirts',
  appUrl: siteUrl,
  appIcon: `${siteUrl}/favicon.svg`,
  projectId: projectId || '0'.repeat(32), // 32文字のダミーID
  chains: [polygon, polygonAmoy],
  transports: {
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          locale="ja"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
