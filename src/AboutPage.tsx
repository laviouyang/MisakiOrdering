import { Clock3, Globe, MapPin, Phone } from 'lucide-react';

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

const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Misaki+Superior+Colorado';
const WEBSITE_URL = 'https://www.misakiatsuperior.com';

export default function AboutPage({ restaurantName, location, story, hours, phone, dishCount, categoryCount, onStartOrder }: Props) {
  return (
    <main className="content-wrap page" data-testid="page-about">
      <div className="about-layout">
        <section className="about-story">
          <h1>About {restaurantName}</h1>
          {story.split('\n').filter((line) => line.trim()).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <p className="about-menu-line">The menu has {dishCount} dishes across {categoryCount} categories, from chef’s special rolls to ramen and kushiyaki.</p>
          <button type="button" className="checkout-button secondary about-cta" onClick={onStartOrder} data-testid="button-about-start-order">See the menu</button>
        </section>

        <aside className="about-visit" aria-label="Visit us">
          <h2>Visit us</h2>
          <a className="visit-row" href={MAP_URL} target="_blank" rel="noreferrer" data-testid="link-map">
            <MapPin size={18} /><span><strong>{location}</strong>Open in Maps</span>
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
          <a className="visit-row" href={WEBSITE_URL} target="_blank" rel="noreferrer" data-testid="link-website">
            <Globe size={18} /><span><strong>misakiatsuperior.com</strong>The restaurant’s website</span>
          </a>
        </aside>
      </div>
    </main>
  );
}
