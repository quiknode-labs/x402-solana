import { after, describe, test } from "node:test";
import assert from "node:assert";
import { access, unlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createSolanaX402Clients } from "../src/index.js";

// In CI, SOLANA_KEYPAIR env var holds the keypair JSON. Locally, fall back to
// the default Solana CLI keypair file.
const resolveWalletFile = async (): Promise<{
  walletFile: string;
  tempFile?: string;
} | null> => {
  if (process.env.SOLANA_KEYPAIR) {
    const tempFile = join(tmpdir(), `test-wallet-${Date.now()}.json`);
    await writeFile(tempFile, process.env.SOLANA_KEYPAIR);
    return { walletFile: tempFile, tempFile };
  }
  const defaultFile = join(homedir(), ".config/solana/id.json");
  try {
    await access(defaultFile);
    return { walletFile: defaultFile };
  } catch {
    return null;
  }
};

describe("createSolanaX402Clients", () => {
  test("creates rpc and rpcSubscriptions clients for devnet", async (context) => {
    const resolved = await resolveWalletFile();
    if (!resolved) {
      context.skip(
        "Skipping: no wallet available — set SOLANA_KEYPAIR env var or add ~/.config/solana/id.json",
      );
      return;
    }
    const { walletFile, tempFile } = resolved;

    after(async () => {
      if (tempFile) await unlink(tempFile).catch(() => {});
    });

    const { rpc, rpcSubscriptions } = await createSolanaX402Clients(
      "devnet",
      walletFile,
    );

    assert.ok(rpc, "rpc client should be defined");
    assert.ok(rpcSubscriptions, "rpcSubscriptions client should be defined");

    const slot = await rpc.getSlot().send();
    assert.strictEqual(typeof slot, "bigint");
    assert.ok(slot > 0n, "slot should be greater than 0");
  });
});
