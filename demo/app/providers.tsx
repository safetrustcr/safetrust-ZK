"use client";

import { Networks } from "@creit.tech/stellar-wallets-kit";
import { PollarProvider } from "@pollar/react";
import { stellarWalletsKitAdapters } from "@pollar/stellar-wallets-kit-adapter";
import { useMemo, type ReactNode } from "react";
import "@pollar/react/styles.css";
import { getPollarClient } from "../lib/pollar-client";
import { kitNetwork, POLLAR_BASE_URL, resolveStellarNetwork } from "../lib/pollar";

type Props = {
  apiKey: string;
  children: ReactNode;
};

export function PollarAppProvider({ apiKey, children }: Props) {
  const network = resolveStellarNetwork();

  const walletAdapters = useMemo(
    () =>
      stellarWalletsKitAdapters({
        network: kitNetwork(network) as Networks,
        picker: { groupLabel: "Stellar wallet" },
      }),
    [network],
  );

  const client = useMemo(
    () =>
      getPollarClient({
        apiKey,
        baseUrl: POLLAR_BASE_URL,
        stellarNetwork: network,
        walletAdapters,
      }),
    [apiKey, network, walletAdapters],
  );

  return <PollarProvider client={client}>{children}</PollarProvider>;
}
