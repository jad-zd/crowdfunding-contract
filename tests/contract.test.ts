import { test, beforeEach, afterEach } from "vitest";
import { assertAccount, SWorld, SWallet, SContract, e } from "xsuite";

let world: SWorld;
let deployer: SWallet;
let contract: SContract;

beforeEach(async () => {
  world = await SWorld.start();
  deployer = await world.createWallet({
    nonce: 0,
    balance: 1_000_000n,
  });
  ({ contract } = await deployer.deployContract({
    code: "file:output/contract.wasm",
    codeMetadata: [],
    gasLimit: 5_000_000,
    codeArgs: [e.U(500_000_000_000n)],
    gasPrice: 0,
  }));
});

afterEach(async () => {
  await world.terminate();
});

test("crowdfunding deployment test", async () => {
  assertAccount(await deployer.getAccountWithKvs(), {
    nonce: 1,
    balance: 1_000_000n,
    allKvs: [],
  });

  assertAccount(await contract.getAccountWithKvs(), {
    nonce: 0,
    balance: 0n,
    allKvs: [e.kvs.Mapper("target").Value(e.U(500_000_000_000n))],
    code: "file:output/contract.wasm",
  });
});
