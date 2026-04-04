use anchor_lang::prelude::*;

declare_id!("GoosE8ets111111111111111111111111111111111");

#[program]
pub mod goose_bets {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        round_id: String,
        options_count: u8,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.betting_pool;
        pool.round_id = round_id;
        pool.options_count = options_count;
        pool.total_pot = 0;
        pool.option_totals = vec![0u64; options_count as usize];
        pool.is_resolved = false;
        pool.winning_option = None;
        pool.authority = ctx.accounts.authority.key();
        pool.bump = ctx.bumps.betting_pool;
        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        _round_id: String,
        option: u8,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.betting_pool;

        require!(!pool.is_resolved, GooseBetsError::RoundAlreadyResolved);
        require!(
            (option as usize) < pool.option_totals.len(),
            GooseBetsError::InvalidOption
        );
        require!(amount > 0, GooseBetsError::InvalidAmount);

        // Transfer SOL from user to pool PDA
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.betting_pool.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.betting_pool.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update pool state
        pool.total_pot += amount;
        pool.option_totals[option as usize] += amount;

        // Initialize user bet
        let user_bet = &mut ctx.accounts.user_bet;
        user_bet.user = ctx.accounts.user.key();
        user_bet.round_id = pool.round_id.clone();
        user_bet.option = option;
        user_bet.amount = amount;
        user_bet.claimed = false;
        user_bet.bump = ctx.bumps.user_bet;

        Ok(())
    }

    pub fn resolve_round(
        ctx: Context<ResolveRound>,
        _round_id: String,
        winning_option: u8,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.betting_pool;

        require!(!pool.is_resolved, GooseBetsError::RoundAlreadyResolved);
        require!(
            (winning_option as usize) < pool.option_totals.len(),
            GooseBetsError::InvalidOption
        );

        pool.is_resolved = true;
        pool.winning_option = Some(winning_option);

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>, _round_id: String) -> Result<()> {
        let pool = &ctx.accounts.betting_pool;
        let user_bet = &mut ctx.accounts.user_bet;

        require!(pool.is_resolved, GooseBetsError::RoundNotResolved);
        require!(!user_bet.claimed, GooseBetsError::AlreadyClaimed);

        let winning_option = pool.winning_option.unwrap();
        require!(
            user_bet.option == winning_option,
            GooseBetsError::NotAWinner
        );

        // Calculate proportional share
        let winning_total = pool.option_totals[winning_option as usize];
        let share = if winning_total > 0 {
            (user_bet.amount as u128)
                .checked_mul(pool.total_pot as u128)
                .unwrap()
                .checked_div(winning_total as u128)
                .unwrap() as u64
        } else {
            user_bet.amount // refund if nobody won
        };

        // Transfer SOL from pool PDA to user
        **ctx
            .accounts
            .betting_pool
            .to_account_info()
            .try_borrow_mut_lamports()? -= share;
        **ctx
            .accounts
            .user
            .to_account_info()
            .try_borrow_mut_lamports()? += share;

        user_bet.claimed = true;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(round_id: String, options_count: u8)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = BettingPool::space(options_count, &round_id),
        seeds = [b"pool", round_id.as_bytes()],
        bump
    )]
    pub betting_pool: Account<'info, BettingPool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_id: String, option: u8, amount: u64)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"pool", round_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,
    #[account(
        init,
        payer = user,
        space = UserBet::SPACE,
        seeds = [b"bet", round_id.as_bytes(), user.key().as_ref()],
        bump
    )]
    pub user_bet: Account<'info, UserBet>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_id: String, winning_option: u8)]
pub struct ResolveRound<'info> {
    #[account(
        mut,
        seeds = [b"pool", round_id.as_bytes()],
        bump = betting_pool.bump,
        has_one = authority,
    )]
    pub betting_pool: Account<'info, BettingPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(round_id: String)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [b"pool", round_id.as_bytes()],
        bump = betting_pool.bump,
    )]
    pub betting_pool: Account<'info, BettingPool>,
    #[account(
        mut,
        seeds = [b"bet", round_id.as_bytes(), user.key().as_ref()],
        bump = user_bet.bump,
        has_one = user,
    )]
    pub user_bet: Account<'info, UserBet>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct BettingPool {
    pub round_id: String,
    pub options_count: u8,
    pub total_pot: u64,
    pub option_totals: Vec<u64>,
    pub is_resolved: bool,
    pub winning_option: Option<u8>,
    pub authority: Pubkey,
    pub bump: u8,
}

impl BettingPool {
    pub fn space(options_count: u8, round_id: &str) -> usize {
        8 // discriminator
        + 4 + round_id.len() // round_id (String)
        + 1 // options_count
        + 8 // total_pot
        + 4 + (options_count as usize * 8) // option_totals (Vec<u64>)
        + 1 // is_resolved
        + 1 + 1 // winning_option (Option<u8>)
        + 32 // authority
        + 1 // bump
    }
}

#[account]
pub struct UserBet {
    pub user: Pubkey,
    pub round_id: String,
    pub option: u8,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl UserBet {
    pub const SPACE: usize = 8 // discriminator
        + 32 // user
        + 4 + 20 // round_id (max ~20 chars)
        + 1 // option
        + 8 // amount
        + 1 // claimed
        + 1; // bump
}

#[error_code]
pub enum GooseBetsError {
    #[msg("Round has already been resolved")]
    RoundAlreadyResolved,
    #[msg("Invalid betting option")]
    InvalidOption,
    #[msg("Invalid bet amount")]
    InvalidAmount,
    #[msg("Round has not been resolved yet")]
    RoundNotResolved,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("You did not bet on the winning option")]
    NotAWinner,
}
