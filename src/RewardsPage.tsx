import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

// The friends & family scratch card. A digital version of the scratch cards
// Misaki hands out: scratch to reveal 5–40% off your next order.
// Each saved order earns a new card. Cards are saved on the customer's device
// (see `scratchCard` in App.tsx).

export type ScratchCard = { percent: number; scratched: boolean };

// The discounts a card can show, and how likely each one is.
// Smaller discounts are more common; 40% off is rare.
const PRIZES: Array<{ percent: number; weight: number }> = [
  { percent: 5, weight: 30 },
  { percent: 10, weight: 25 },
  { percent: 15, weight: 18 },
  { percent: 20, weight: 12 },
  { percent: 25, weight: 7 },
  { percent: 30, weight: 5 },
  { percent: 35, weight: 2 },
  { percent: 40, weight: 1 },
];

/** Picks a random discount using the weights above. */
export function drawCard(): ScratchCard {
  const totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll < 0) return { percent: prize.percent, scratched: false };
  }
  return { percent: PRIZES[0].percent, scratched: false };
}

type Props = {
  card: ScratchCard | null;
  restaurantName: string;
  hasLastOrder: boolean;
  onReveal: () => void;
  onOrderAgain: () => void;
  onStartOrder: () => void;
};

export default function RewardsPage({ card, restaurantName, hasLastOrder, onReveal, onOrderAgain, onStartOrder }: Props) {
  return (
    <main className="content-wrap page" data-testid="page-rewards">
      <div className="page-head">
        <h1>Scratch card</h1>
        <p>Friends &amp; family get a scratch card for 5–40% off. Every order you save earns a new card for next time.</p>
      </div>

      {card ? (
        <section className={`scratch-card${card.scratched ? ' is-revealed' : ''}`} aria-label={`${restaurantName} scratch card`} data-testid="card-scratch">
          <div className="scratch-card-head">
            <span className="scratch-crest" aria-hidden="true">美</span>
            <div>
              <strong>{restaurantName} friends &amp; family</strong>
              <span>{card.scratched ? 'Applied to your next order' : 'Scratch the silver area'}</span>
            </div>
          </div>
          <ScratchArea percent={card.percent} scratched={card.scratched} onReveal={onReveal} />
        </section>
      ) : (
        <div className="scratch-empty" data-testid="status-no-card">
          <Gift size={22} />
          <span>Save an order to get a scratch card.</span>
        </div>
      )}

      <div className="page-actions">
        <button type="button" className="checkout-button secondary" onClick={onStartOrder} data-testid="button-rewards-start-order">Start an order</button>
        {hasLastOrder && <button type="button" className="plain-btn with-icon" onClick={onOrderAgain} data-testid="button-rewards-order-again">Order your last meal again</button>}
      </div>

      <p className="page-footnote">Cards are saved on this device. One discount per order.</p>
    </main>
  );
}

// The silver layer is a canvas. Dragging erases it; once about half is
// cleared, the whole card reveals itself.
function ScratchArea({ percent, scratched, onReveal }: { percent: number; scratched: boolean; onReveal: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scratched) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#c9ccd6');
    gradient.addColorStop(0.5, '#eef0f5');
    gradient.addColorStop(1, '#b7bbc8');
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#5c6378';
    context.font = '700 36px "Zen Kaku Gothic New", system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Scratch here', canvas.width / 2, canvas.height * 0.4);
  }, [scratched]);

  // Erases a circle where the finger or mouse is.
  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const box = canvas.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * canvas.width;
    const y = ((clientY - box.top) / box.height) * canvas.height;
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(x, y, 34, 0, Math.PI * 2);
    context.fill();
  };

  // Checks how much silver is left; reveals the card past 50% scratched.
  const checkProgress = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    for (let index = 3; index < pixels.length; index += 16) {
      if (pixels[index] === 0) cleared += 1;
    }
    if (cleared / (pixels.length / 16) > 0.5) onReveal();
  };

  return (
    <div className="scratch-area">
      <div className="scratch-prize" aria-live="polite">
        {scratched || isScratching ? <><strong>{percent}% off</strong><span>your next order</span></> : null}
      </div>
      {!scratched && (
        <>
          <canvas
            ref={canvasRef}
            className="scratch-cover"
            width={640}
            height={240}
            aria-hidden="true"
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setIsScratching(true); scratchAt(event.clientX, event.clientY); }}
            onPointerMove={(event) => { if (event.buttons > 0) scratchAt(event.clientX, event.clientY); }}
            onPointerUp={checkProgress}
            data-testid="canvas-scratch"
          />
          <button type="button" className="scratch-reveal-btn" onClick={onReveal} data-testid="button-reveal">Tap to reveal</button>
        </>
      )}
    </div>
  );
}
