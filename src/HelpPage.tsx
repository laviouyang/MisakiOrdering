import { useMemo, useState } from 'react';
import { HelpCircle, Search, X } from 'lucide-react';

// The Help page: how to order, plus an interactive Q&A.
// Customers type a question (or tap a common one) and the best-matching
// answers show up. Numbers like the minimum order come from the shop's
// current rules, so the answers stay correct when staff change them.

type Props = {
  minimumOrder: number;
  taxRate: number;
  deliveryFee: number;
  maxPerItem: number;
  phone: string;
  onStartOrder: () => void;
};

type Question = { id: string; question: string; answer: string; keywords: string[] };

// Small words that shouldn't count when matching a question.
const IGNORE = new Set(['a', 'an', 'the', 'i', 'my', 'me', 'do', 'does', 'is', 'are', 'can', 'how', 'what', 'why', 'to', 'of', 'in', 'on', 'for', 'it', 'and', 'or', 'you', 'your', 'get', 'with', 'there', 'when', 'where', 'which', 'will', 'be']);
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9%$ ]/g, ' ').split(/\s+/).filter((word) => word && !IGNORE.has(word));

export default function HelpPage({ minimumOrder, taxRate, deliveryFee, maxPerItem, phone, onStartOrder }: Props) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const questions: Question[] = useMemo(() => [
    { id: 'note', question: 'How do I ask for changes, like no cucumber?',
      answer: 'Add the dish, then click "Add note" under it in Your order and type your request. Add-ons and changes may cost extra, paid at the restaurant.',
      keywords: ['note', 'notes', 'change', 'changes', 'cucumber', 'without', 'remove', 'extra', 'special', 'request', 'modify', 'customize'] },
    { id: 'soldout', question: 'Why can’t I add a dish?',
      answer: 'Dishes marked "Sold out" can’t be ordered right now. Staff mark them as available again when they’re back.',
      keywords: ['sold', 'out', 'unavailable', 'add', 'button', 'missing', 'grey', 'gray', 'disabled'] },
    { id: 'limit', question: `Why can’t I order more than ${maxPerItem} of something?`,
      answer: `You can order up to ${maxPerItem} of each dish online, so the kitchen can keep up. For a bigger order, please call the restaurant.`,
      keywords: ['limit', 'more', 'maximum', 'max', 'many', 'quantity', 'large', 'big', 'party', String(maxPerItem)] },
    { id: 'minimum', question: 'Is there a minimum order?',
      answer: `Yes. Your food needs to add up to at least $${minimumOrder.toFixed(2)} before you can check out. Your order shows how much more you need.`,
      keywords: ['minimum', 'least', 'small', 'checkout', 'check', 'continue', 'disabled'] },
    { id: 'total', question: 'How is my total worked out?',
      answer: `Your total is the dishes, minus any scratch card discount, plus ${taxRate}% tax${deliveryFee > 0 ? `, plus a $${deliveryFee.toFixed(2)} delivery fee if you choose delivery` : ''}. You see the full total before you place the order.`,
      keywords: ['total', 'tax', 'price', 'cost', 'fee', 'delivery', 'subtotal', 'pay', 'much', 'money', '$'] },
    { id: 'budget', question: 'Can I set a budget?',
      answer: 'Yes. At checkout, type the most you want to spend. If your total goes over, the app warns you so you can change your order.',
      keywords: ['budget', 'spend', 'limit', 'money', 'over', 'cheap', 'afford'] },
    { id: 'scratch', question: 'How does the scratch card work?',
      answer: 'Open the Scratch card tab and type the friends & family code Misaki gave you. Scratch the card to reveal 5–40% off. The discount comes off one plate of the most expensive dish in your order, and it’s good for that order only.',
      keywords: ['scratch', 'card', 'discount', 'code', 'coupon', 'deal', 'promo', 'percent', '%', 'off', 'family', 'friends', 'save'] },
    { id: 'code', question: 'Where do I get a scratch card code?',
      answer: 'The Misaki family gives the code to friends and family. Each code can be used once on this device.',
      keywords: ['code', 'where', 'scratch', 'card', 'family', 'friends', 'coupon', 'promo'] },
    { id: 'again', question: 'Can I order the same thing again?',
      answer: 'Yes. After you place an order, an "Order again" button puts the same dishes and notes back in your order. Anything that’s sold out now is skipped, and the app tells you which.',
      keywords: ['again', 'reorder', 'same', 'last', 'previous', 'repeat', 'usual'] },
    { id: 'pickup', question: 'Can I choose when to pick up?',
      answer: 'Yes. When you choose Pickup, pick "As soon as possible" or a time later today. Only times when Misaki is open are shown.',
      keywords: ['pickup', 'pick', 'time', 'when', 'later', 'schedule', 'ready'] },
    { id: 'veg', question: 'How do I find vegetarian dishes?',
      answer: 'Use the Vegetarian button on the menu. Those dishes have no meat or fish in their description. Some sauces and soups can use fish stock, so ask staff if you need to be sure.',
      keywords: ['vegetarian', 'veg', 'vegan', 'meat', 'fish', 'plant', 'diet', 'tofu'] },
    { id: 'allergy', question: 'What if I have an allergy?',
      answer: `Please tell Misaki about any allergy before you eat${phone ? `, or call ${phone}` : ''}. Some dishes contain sesame seeds and masago, not every ingredient is listed, and dishes marked * may be raw or undercooked.`,
      keywords: ['allergy', 'allergies', 'allergic', 'gluten', 'sesame', 'shellfish', 'nut', 'nuts', 'raw', 'ingredients', 'safe'] },
    { id: 'find', question: 'How do I find a certain dish?',
      answer: 'Type its name in "Search dishes" on the menu, or pick a category tab like Ramen or Nigiri & Sashimi.',
      keywords: ['find', 'search', 'look', 'dish', 'category', 'menu', 'ramen', 'sushi', 'roll'] },
    { id: 'hours', question: 'When is Misaki open?',
      answer: 'Tuesday to Thursday 11 am–2 pm and 4:30–9 pm, Friday and Saturday 11 am–2 pm and 4:30–9:30 pm, Sunday 12–8:30 pm. Closed Mondays. The About page has the address and directions.',
      keywords: ['open', 'hours', 'close', 'closed', 'time', 'today', 'monday', 'weekend', 'address', 'where', 'location'] },
    { id: 'staff', question: 'I work at Misaki. How do I change the menu?',
      answer: 'Click "Edit menu" at the top and enter the staff PIN. You can change prices, mark dishes sold out, and update the shop details. Customers can’t open it without the PIN.',
      keywords: ['staff', 'work', 'employee', 'owner', 'edit', 'change', 'menu', 'price', 'pin', 'sold'] },
  ], [minimumOrder, taxRate, deliveryFee, maxPerItem, phone]);

  // Score each question by how many of the typed words match its words.
  const results = useMemo(() => {
    const typed = words(query);
    if (typed.length === 0) return questions;
    return questions
      .map((item) => {
        const pool = new Set([...words(item.question), ...item.keywords]);
        const score = typed.reduce((total, word) => total + (pool.has(word) ? 2 : [...pool].some((p) => p.length > 3 && (p.startsWith(word) || word.startsWith(p))) ? 1 : 0), 0);
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  }, [query, questions]);

  const searching = query.trim().length > 0;
  const quick = ['How does the scratch card work?', 'Is there a minimum order?', 'What if I have an allergy?', 'Can I choose when to pick up?'];

  return (
    <main className="content-wrap page" data-testid="page-help">
      <h1 className="help-title"><HelpCircle size={26} /> Help</h1>

      <section className="help-steps" aria-labelledby="how-to-order">
        <h2 id="how-to-order">How to order</h2>
        <ol>
          <li><strong>Choose</strong> pickup, delivery or dine-in at the top of the menu.</li>
          <li><strong>Add dishes</strong> with the Add button. Use search, the category tabs or the Vegetarian filter to find them.</li>
          <li><strong>Check your order</strong> on the right. Change amounts, add notes, and see your total update as you go.</li>
          <li><strong>Check out:</strong> enter your name and phone, review everything, and place your order.</li>
        </ol>
        <button type="button" className="checkout-button secondary help-cta" onClick={onStartOrder} data-testid="button-help-start-order">Start ordering</button>
      </section>

      <section className="help-ask" aria-labelledby="ask-a-question">
        <h2 id="ask-a-question">Ask a question</h2>
        <div className="search-box help-search">
          <Search size={17} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setOpenId(null); }}
            placeholder="Type a question, like “how do I use a coupon?”" aria-label="Ask a question" data-testid="input-help-question" />
          {searching && <button type="button" className="help-clear" onClick={() => setQuery('')} aria-label="Clear question" data-testid="button-help-clear"><X size={15} /></button>}
        </div>
        {!searching && (
          <div className="help-quick" aria-label="Common questions">
            {quick.map((text) => (
              <button type="button" key={text} onClick={() => { setQuery(text); setOpenId(null); }} data-testid={`button-help-quick-${text.split(' ').slice(-2).join('-').replace(/[^a-z-]/gi, '').toLowerCase()}`}>{text}</button>
            ))}
          </div>
        )}

        <div className="help-answers" aria-live="polite" data-testid="list-help-answers">
          {searching && results.length === 0 && (
            <p className="help-none" data-testid="text-help-no-match">
              We couldn’t find an answer to that. Try other words{phone ? <>, or call Misaki at <a href={`tel:${phone.replace(/[^0-9]/g, '')}`}>{phone}</a></> : ''}.
            </p>
          )}
          {results.map((item, index) => {
            // When searching, the best match opens by itself.
            const open = openId === item.id || (searching && openId === null && index === 0);
            return (
              <div className={`help-item${open ? ' open' : ''}`} key={item.id}>
                <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? '' : item.id)} data-testid={`button-help-q-${item.id}`}>
                  <span>{item.question}</span><span className="help-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
                </button>
                {open && <p data-testid={`text-help-a-${item.id}`}>{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
