import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("goose-bets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GooseBets;
  const authority = provider.wallet;
  const roundId = "round_001";
  const optionsCount = 4;

  let poolPda: PublicKey;
  let poolBump: number;
  let user: Keypair;
  let userBetPda: PublicKey;

  before(async () => {
    [poolPda, poolBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), Buffer.from(roundId)],
      program.programId
    );

    user = Keypair.generate();

    // Airdrop to user
    const sig = await provider.connection.requestAirdrop(
      user.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    [userBetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), Buffer.from(roundId), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes a betting pool", async () => {
    await program.methods
      .initializePool(roundId, optionsCount)
      .accounts({
        bettingPool: poolPda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const pool = await program.account.bettingPool.fetch(poolPda);
    assert.equal(pool.roundId, roundId);
    assert.equal(pool.optionsCount, optionsCount);
    assert.equal(pool.totalPot.toNumber(), 0);
    assert.equal(pool.isResolved, false);
  });

  it("Places a bet", async () => {
    const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL);

    await program.methods
      .placeBet(roundId, 0, betAmount)
      .accounts({
        bettingPool: poolPda,
        userBet: userBetPda,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const pool = await program.account.bettingPool.fetch(poolPda);
    assert.equal(pool.totalPot.toNumber(), LAMPORTS_PER_SOL);

    const bet = await program.account.userBet.fetch(userBetPda);
    assert.equal(bet.option, 0);
    assert.equal(bet.amount.toNumber(), LAMPORTS_PER_SOL);
    assert.equal(bet.claimed, false);
  });

  it("Resolves a round", async () => {
    await program.methods
      .resolveRound(roundId, 0)
      .accounts({
        bettingPool: poolPda,
        authority: authority.publicKey,
      })
      .rpc();

    const pool = await program.account.bettingPool.fetch(poolPda);
    assert.equal(pool.isResolved, true);
    assert.equal(pool.winningOption, 0);
  });

  it("Claims winnings", async () => {
    const balanceBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .claimWinnings(roundId)
      .accounts({
        bettingPool: poolPda,
        userBet: userBetPda,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    const bet = await program.account.userBet.fetch(userBetPda);
    assert.equal(bet.claimed, true);

    const balanceAfter = await provider.connection.getBalance(user.publicKey);
    assert.isAbove(balanceAfter, balanceBefore);
  });
});
