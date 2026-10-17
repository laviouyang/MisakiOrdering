import { Gift, Repeat } from 'lucide-react';

// The rewards stamp card. Customers earn one stamp for every order they save.
// When the card is full, they show this page at the counter to claim the prize.
// Stamps are saved on the customer's device (see `rewards` in App.tsx).

export type Rewards = { stamps: number; redeemed: number };

type Props = {
  rewards: Rewards;
  goal: number;
  prize: string;
  restaurantName: string;
  hasLastOrder: boolean;
  onOrderAgain: () => void;
  onStartOrder: () => void;
  onRedeem: () => void;
};

export default function RewardsPage({ rewards, goal, prize, restaurantName, hasLastOrder, onOrderAgain, onStartOrder, onRedeem }: Props) {
  const filled = Math.min(rewards.stamps, goal);
  const ready = rewards.stamps >= goal;
  const toGo = goal - filled;
  // Two even rows (8 stamps → 4 + 4), between 3 and 6 per row.
  const columns = goal <= 5 ? goal : Math.min(6, Math.max(3, Math.ceil(goal / 2)));

  return (
    <main className="content-wrap page" data-testid="page-rewards">
      <div className="page-head">
        <h1>Rewards</h1>
        <p>Every order you save earns a stamp. Fill the card and {prize} is on us.</p>
      </div>

      <section className={`stamp-card${ready ? ' is-ready' : ''}`} aria-label={`${filled} of ${goal} stamps`} data-testid="card-stamps">
        <div className="stamp-card-head">
          <div>
            <span className="stamp-card-name">{restaurantName} rewards card</span>
            <strong data-testid="text-stamp-count">{filled} of {goal} stamps</strong>
          </div>
          <span className="stamp-card-status">{ready ? 'Reward ready' : `${toGo} more ${toGo === 1 ? 'order' : 'orders'} to go`}</span>
        </div>
        <ol className="stamp-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: goal }, (_, index) => (
            <li key={index} className={`stamp${index < filled ? ' stamped' : ''}`} aria-hidden="true">
              {index < filled ? '美' : index + 1}
            </li>
          ))}
        </ol>
        {ready ? (
          <div className="reward-ready" role="status">
            <Gift size={20} />
            <div>
              <strong>You’ve earned {prize}.</strong>
              <span>Show this screen at the counter to claim it.</span>
            </div>
            <button type="button" className="plain-btn" onClick={onRedeem} data-testid="button-redeem">Mark as claimed</button>
          </div>
        ) : null}
      </section>

      <div className="page-actions">
        <button type="button" className="checkout-button secondary" onClick={onStartOrder} data-testid="button-rewards-start-order">Start an order</button>
        {hasLastOrder && <button type="button" className="plain-btn with-icon" onClick={onOrderAgain} data-testid="button-rewards-order-again"><Repeat size={15} /> Order your last meal again</button>}
      </div>

      <p className="page-footnote">
        Stamps are saved on this device. {rewards.redeemed > 0 ? `You’ve claimed ${rewards.redeemed} ${rewards.redeemed === 1 ? 'reward' : 'rewards'} so far.` : ''}
      </p>
    </main>
  );
}
