import { readFile } from "node:fs/promises";
import { getBase58Decoder } from "@solana/codecs";
import {
  createDefaultSolanaRpcSubscriptionsChannelCreator,
  createKeyPairFromBytes,
  createRpcSubscriptionsTransportFromChannelCreator,
  createSolanaRpcFromTransport,
  createSolanaRpcSubscriptionsFromTransport,
  getAddressFromPublicKey,
  type RpcTransport,
} from "@solana/kit";
import { createQuicknodeX402Client } from "@quicknode/x402";

const NETWORKS = {
  devnet: {
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    rpcUrl: "https://x402.quicknode.com/solana-devnet",
    wsUrl: "wss://x402.quicknode.com/solana-devnet/ws",
  },
  testnet: {
    caip2: "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
    rpcUrl: "https://x402.quicknode.com/solana-testnet",
    wsUrl: "wss://x402.quicknode.com/solana-testnet/ws",
  },
  mainnet: {
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    rpcUrl: "https://x402.quicknode.com/solana-mainnet",
    wsUrl: "wss://x402.quicknode.com/solana-mainnet/ws",
  },
} as const;

// Solana private keys usually use 'array of numbers' format, so convert to base58
const loadPrivateKeyAndConvertToBase58 = async (
  keyPairFile: string,
): Promise<{ svmPrivateKey: string; address: string }> => {
  const keyBytes = JSON.parse(
    await readFile(keyPairFile, "utf-8"),
  ) as Array<number>;
  const keyByteArray = new Uint8Array(keyBytes);
  const keyPair = await createKeyPairFromBytes(keyByteArray);
  const address = await getAddressFromPublicKey(keyPair.publicKey);
  const svmPrivateKey = getBase58Decoder().decode(keyByteArray);
  return { svmPrivateKey, address };
};

export const createSolanaX402Clients = async (
  network: keyof typeof NETWORKS,
  keyPairFile: string,
  { paymentNetwork = network }: { paymentNetwork?: keyof typeof NETWORKS } = {},
) => {
  const { rpcUrl, wsUrl } = NETWORKS[network];
  const { caip2: paymentCaip2 } = NETWORKS[paymentNetwork];
  const { svmPrivateKey } = await loadPrivateKeyAndConvertToBase58(keyPairFile);
  const client = await createQuicknodeX402Client({
    baseUrl: "https://x402.quicknode.com",
    network: paymentCaip2,
    svmPrivateKey,
    preAuth: true,
  });

  const sendRpcRequest = async (payload: unknown, signal?: AbortSignal | null) => {
    const response = await client.fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    return response.json();
  };

  // TODO: raised with QuickNode engineering — error should be an object with a message
  // field per JSON-RPC 2.0 spec. Normalize until the server is fixed.
  const normalizeResult = (result: any) => {
    if (typeof result?.error === "string") {
      result.error = { message: result.error };
    } else if (result?.error && result.error.message === undefined) {
      result.error.message = result.error.error;
    }
    return result;
  };

  const rpcTransport: RpcTransport = async ({ payload, signal }) => {
    const result = normalizeResult(await sendRpcRequest(payload, signal));
    if (result?.error?.message === "lifetime_limit_reached") {
      await client.authenticate();
      return normalizeResult(await sendRpcRequest(payload, signal));
    }
    return result;
  };

  const rpc = createSolanaRpcFromTransport(rpcTransport);

  const token = client.getToken();
  const authenticatedWsUrl = `${wsUrl}?token=${token}`;
  const channelCreator = createDefaultSolanaRpcSubscriptionsChannelCreator({
    url: authenticatedWsUrl,
  });
  const subscriptionsTransport =
    createRpcSubscriptionsTransportFromChannelCreator(channelCreator);
  const rpcSubscriptions = createSolanaRpcSubscriptionsFromTransport(
    subscriptionsTransport,
  );

  return { rpc, rpcSubscriptions };
};
