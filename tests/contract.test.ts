import { test, beforeEach, afterEach, expect } from "vitest";
import { assertAccount, SWorld, SWallet, SContract, e, d } from "xsuite";

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
    codeArgs: [e.U(500_000_000_000n), e.U64(123_000)],
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
    allKvs: [
      e.kvs.Mapper("target").Value(e.U(500_000_000_000n)),
      e.kvs.Mapper("deadline").Value(e.U64(123_000)),
    ],
    code: "file:output/contract.wasm",
  });
});

test("crowdfunding funding test", async () => {
  const donor = await world.createWallet({
    nonce: 0,
    balance: 400_000_000_000n,
  });

  await donor.callContract({
    callee: contract,
    value: 250_000_000_000n,
    funcName: "fund",
    funcArgs: [],
    gasLimit: 100_000_000,
    gasPrice: 0,
  });

  assertAccount(await deployer.getAccountWithKvs(), {
    nonce: 1,
    balance: 1_000_000n,
    allKvs: [],
  });

  assertAccount(await donor.getAccountWithKvs(), {
    nonce: 1,
    balance: 150_000_000_000n,
    allKvs: [],
  });

  assertAccount(await contract.getAccountWithKvs(), {
    nonce: 0,
    balance: 250_000_000_000n,
    allKvs: [
      e.kvs.Mapper("target").Value(e.U(500_000_000_000n)),
      e.kvs.Mapper("deadline").Value(e.U64(123_000)),
      e.kvs
        .Mapper("deposit", e.Addr(donor.toString()))
        .Value(e.U(250_000_000_000n)),
    ],
    code: "file:output/contract.wasm",
  });
});

test("trying to fund one block too late", async () => {
  const donor = await world.createWallet({
    nonce: 0,
    balance: 400_000_000_000n,
  });

  world.setCurrentBlockInfo({
    timestamp: 123_001,
  });

  await donor
    .callContract({
      callee: contract,
      value: 10_000_000_000n,
      funcName: "fund",
      funcArgs: [],
      gasLimit: 100_000_000,
      gasPrice: 0,
    })
    .assertFail({ code: 4, message: "cannot fund after deadline" });

  const { returnData, returnCode, returnMessage } = await world.query({
    callee: contract,
    funcName: "status",
    funcArgs: [],
  });

  expect(d.U().topDecode(returnData[0])).toEqual(2n); // why does it return a BigUInt ? It is an enum, shouldn't it be a simple u8 ?
  expect(returnCode).toEqual(0);
});
