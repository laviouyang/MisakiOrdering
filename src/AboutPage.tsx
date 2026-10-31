import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Globe, MapPin, Phone, Sun, Truck } from 'lucide-react';

// The About page: the restaurant's story and how to find it.
// All of the wording can be changed in Edit menu → Shop details.

type Props = {
  restaurantName: string;
  location: string;
  story: string;
  hours: string;
  phone: string;
  dishCount: number;
  categoryCount: number;
  onStartOrder: () => void;
};

const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=402+Marshall+Road+Superior+CO+80027';
const ADDRESS = '402 Marshall Road, Superior, CO 80027';
const RESERVATIONS_URL = 'https://www.misakiatsuperior.com/reservations';
const DELIVERY_URL = 'https://direct.chownow.com/order/37403/locations/56958';
const WEBSITE_URL = 'https://www.misakiatsuperior.com';

type Credit = { title: string; author: string; license: string; source: string };

export default function AboutPage({ restaurantName, story, hours, phone, dishCount, categoryCount, onStartOrder }: Props) {
  // Credits for the dish photos downloaded by `npm run photos`.
  const [credits, setCredits] = useState<Record<string, Credit>>({});
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}dishes/credits.json`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => setCredits(data as Record<string, Credit>))
      .catch(() => setCredits({}));
  }, []);
  const creditList = Object.entries(credits);

  return (
    <main className="content-wrap page" data-testid="page-about">
      <div className="about-layout">
        <section className="about-story">
          <h1>About {restaurantName}</h1>
          {story.split('\n').filter((line) => line.trim()).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <h2 className="about-sub">Good to know</h2>
          <ul className="about-list" data-testid="list-accommodations">
            <li><strong>Patio seating</strong> is available.</li>
            <li><strong>Pickup:</strong> choose a pickup time when you check out. Minimum order is $10.</li>
            <li><strong>Special requests:</strong> add a note to any dish. Add-ons and changes may cost extra.</li>
            <li><strong>Allergies:</strong> tell staff about any allergies or dietary needs. Some dishes contain sesame seeds and masago, and dishes marked * may be raw or undercooked.</li>
            <li><strong>Vegetarian:</strong> use the Vegetarian filter on the menu.</li>
            <li><strong>Fresh fish</strong> is imported daily from Japan and around the world, including rare fish for nigiri and sashimi.</li>
            <li><strong>Drinks:</strong> Japanese beer and sake, plus wine, shochu, spirits and cocktails (21+).</li>
          </ul>
          <p className="about-menu-line">The menu has {dishCount} dishes across {categoryCount} categories, from chef’s special rolls to ramen and kushiyaki.</p>
          <button type="button" className="checkout-button secondary about-cta" onClick={onStartOrder} data-testid="button-about-start-order">See the menu</button>
          {creditList.length > 0 && (
            <details className="photo-credits" data-testid="section-photo-credits">
              <summary>Photo credits</summary>
              <p>Dish photos are examples from Wikimedia Commons, not photos of Misaki’s food. Thank you to these photographers:</p>
              <ul>
                {creditList.map(([key, credit]) => (
                  <li key={key}><a href={credit.source} target="_blank" rel="noreferrer">{credit.title}</a> by {credit.author} ({credit.license})</li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <aside className="about-visit" aria-label="Visit us">
          <h2>Visit us</h2>
          <a className="visit-row" href={MAP_URL} target="_blank" rel="noreferrer" data-testid="link-map">
            <MapPin size={18} /><span><strong>{ADDRESS}</strong>Open in Maps</span>
          </a>
          {hours.trim() && (
            <div className="visit-row" data-testid="text-hours">
              <Clock3 size={18} /><span><strong>Hours</strong>{hours.split('\n').map((line, index) => <span className="visit-line" key={index}>{line}</span>)}</span>
            </div>
          )}
          {phone.trim() && (
            <a className="visit-row" href={`tel:${phone.replace(/[^\d+]/g, '')}`} data-testid="link-phone">
              <Phone size={18} /><span><strong>{phone}</strong>Call to order or ask about allergies</span>
            </a>
          )}
          <a className="visit-row" href={RESERVATIONS_URL} target="_blank" rel="noreferrer" data-testid="link-reservations">
            <CalendarDays size={18} /><span><strong>Reservations</strong>Book a table on Misaki’s website</span>
          </a>
          <a className="visit-row" href={DELIVERY_URL} target="_blank" rel="noreferrer" data-testid="link-delivery">
            <Truck size={18} /><span><strong>Delivery</strong>Order delivery through ChowNow</span>
          </a>
          <div className="visit-row" data-testid="text-patio">
            <Sun size={18} /><span><strong>Patio seating</strong>Now open</span>
          </div>
          <a className="visit-row" href={WEBSITE_URL} target="_blank" rel="noreferrer" data-testid="link-website">
            <Globe size={18} /><span><strong>misakiatsuperior.com</strong>The restaurant’s website</span>
          </a>
        </aside>
      </div>
    </main>
  );
}
