import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Clock3, ImagePlus, MapPin, Minus, Plus, Search, ShoppingBag, Store, Truck, Utensils, X, Pencil, RotateCcw, Save } from 'lucide-react';
import menuData from './data/misaki-menu.json';

// One dish on the menu. The full menu lives in src/data/misaki-menu.json.
type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  availability: 'available' | 'unavailable';
  sourcePrice: string;
  sourceCategory: string;
  sourceName: string;
  sourceDescription: string;
};
type LocalCopy = {
  brandName: string;
  locationCaption: string;
  topbarLocation: string;
  topbarStatus: string;
  pickupHint: string;
  deliveryHint: string;
  dineInHint: string;
  heroEyebrow: string;
  heroHeading: string;
  heroDescription: string;
  heroNote: string;
  menuHeading: string;
  menuDescription: string;
  footerRestaurant: string;
  footerInstallNote: string;
};
type LocalRules = { minimumOrder: number; taxRate: number; deliveryFee: number; maxPerItem: number };
type ItemOverride = Partial<Pick<MenuItem, 'name' | 'description' | 'category' | 'price' | 'availability'>>;
type CartEntry = { itemId: string; quantity: number };
type Fulfillment = 'pickup' | 'delivery' | 'dine-in';
type DemoOrder = {
  id: string;
  createdAt: string;
  fulfillment: Fulfillment;
  customerName: string;
  phone: string;
  address?: string;
  items: CartEntry[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  specialRequests?: string;
};

const menuItems: MenuItem[] = (menuData as { items: MenuItem[] }).items.map((item) => ({
  ...item,
  sourceName: item.sourceName ?? item.name,
  sourceDescription: item.sourceDescription ?? item.description,
  sourceCategory: item.sourceCategory ?? item.category,
  sourcePrice: item.sourcePrice ?? `$${item.price.toFixed(2)}`,
}));
const DB_NAME = 'misaki-local-photos';
const STORE_NAME = 'item-images';
const OVERRIDES_KEY = 'misaki-device-menu-overrides-v1';
const COPY_KEY = 'misaki-device-copy-overrides-v1';
const RULES_KEY = 'misaki-device-order-rules-v1';
const money = (amount: number) => `$${amount.toFixed(2)}`;
const defaultCopy: LocalCopy = {
  brandName: 'Misaki',
  locationCaption: 'Japanese Kitchen · Superior',
  topbarLocation: 'Superior, Colorado',
  topbarStatus: 'Made fresh to order',
  pickupHint: 'Pick up when it suits you',
  deliveryHint: 'Address required for delivery',
  dineInHint: 'We’ll have a table ready',
  heroEyebrow: 'A little taste of Japan, close to home',
  heroHeading: 'Good food.\nGood neighbors.',
  heroDescription: 'Rolls, bowls, and all the little things we love making for Superior. Choose your favorites and we’ll take it from here.',
  heroNote: 'Locally owned in Superior\nFreshly prepared, just for you',
  menuHeading: 'Explore the menu',
  menuDescription: 'All the favorites, made here in Superior.',
  footerRestaurant: 'Misaki @ Superior · Superior, Colorado',
  footerInstallNote: 'On iPhone, use Share → Add to Home Screen. On Mac, use your browser’s Install or Add to Dock option.',
};
const defaultRules: LocalRules = { minimumOrder: 10, taxRate: 8.85, deliveryFee: 4.5, maxPerItem: 10 };

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readPhotos(): Promise<Record<string, Blob>> {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result: Record<string, Blob> = {};
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (current) {
        result[String(current.key)] = current.value as Blob;
        current.continue();
      } else resolve(result);
    };
    cursor.onerror = () => reject(cursor.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

async function writePhoto(id: string, blob: Blob | null) {
  const db = await openPhotoDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    if (blob) tx.objectStore(STORE_NAME).put(blob, id);
    else tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const fulfillmentLabel: Record<Fulfillment, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  'dine-in': 'Dine-in',
};

function App() {
  const [overrides, setOverrides] = useState<Record<string, ItemOverride>>({});
  const [items, setItems] = useState<MenuItem[]>(menuItems);
  const [copy, setCopy] = useState<LocalCopy>(defaultCopy);
  const [copyOverrides, setCopyOverrides] = useState<Partial<LocalCopy>>({});
  const [rules, setRules] = useState<LocalRules>(defaultRules);
  const [rulesOverrides, setRulesOverrides] = useState<Partial<LocalRules>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'menu' | 'copy'>('menu');
  const [draftItems, setDraftItems] = useState<Record<string, MenuItem>>({});
  const [draftCopy, setDraftCopy] = useState<LocalCopy>(defaultCopy);
  const [draftRules, setDraftRules] = useState<LocalRules>(defaultRules);
  const [editorSearch, setEditorSearch] = useState('');
  const [editorError, setEditorError] = useState('');
  const [category, setCategory] = useState('All items');
  const [search, setSearch] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photoError, setPhotoError] = useState<Record<string, string>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [storedOrder, setStoredOrder] = useState<DemoOrder | null>(null);
  const [idbError, setIdbError] = useState(false);
  const [quantityNotice, setQuantityNotice] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const photoUrlsRef = useRef<Record<string, string>>({});
  const categories = useMemo(() => ['All items', ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    try {
      const savedOverrides = localStorage.getItem(OVERRIDES_KEY);
      if (savedOverrides) setOverrides(JSON.parse(savedOverrides) as Record<string, ItemOverride>);
      const savedCopy = localStorage.getItem(COPY_KEY);
      if (savedCopy) setCopyOverrides(JSON.parse(savedCopy) as Partial<LocalCopy>);
      const savedRules = localStorage.getItem(RULES_KEY);
      if (savedRules) setRulesOverrides(JSON.parse(savedRules) as Partial<LocalRules>);
    } catch { /* Continue with the default menu when saved edits are unavailable or malformed. */ }
  }, []);

  useEffect(() => {
    setItems(menuItems.map((item) => ({ ...item, ...(overrides[item.id] ?? {}) })));
  }, [overrides]);

  useEffect(() => {
    setCopy({ ...defaultCopy, ...copyOverrides });
  }, [copyOverrides]);

  useEffect(() => {
    setRules({ ...defaultRules, ...rulesOverrides });
  }, [rulesOverrides]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('misaki-last-demo-order');
      if (saved) setStoredOrder(JSON.parse(saved) as DemoOrder);
    } catch { /* Local order history is optional in private browsing. */ }
    if (!('indexedDB' in window)) { setIdbError(true); return; }
    readPhotos().then((photos) => {
      const urls: Record<string, string> = {};
      Object.entries(photos).forEach(([id, blob]) => { urls[id] = URL.createObjectURL(blob); });
      photoUrlsRef.current = urls;
      setPhotoUrls(urls);
    }).catch(() => setIdbError(true));
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
    // Run once to restore device-local photo slots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === 'All items' || item.category === category;
      const matchesSearch = !needle || `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase().includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [category, search, items]);
  const subtotal = cart.reduce((sum, entry) => sum + (itemMap.get(entry.itemId)?.price ?? 0) * entry.quantity, 0);
  const tax = Number((subtotal * rules.taxRate / 100).toFixed(2));
  const deliveryFee = fulfillment === 'delivery' && cart.length > 0 ? rules.deliveryFee : 0;
  const total = Number((subtotal + tax + deliveryFee).toFixed(2));
  const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const budgetNumber = budget.trim() ? Number(budget) : null;
  const exceedsBudget = budgetNumber !== null && Number.isFinite(budgetNumber) && total > budgetNumber;

  const openEditor = () => {
    setDraftItems(Object.fromEntries(items.map((item) => [item.id, { ...item }])));
    setDraftCopy({ ...copy });
    setDraftRules({ ...rules });
    setEditorError('');
    setEditorSearch('');
    setEditorTab('menu');
    setEditorOpen(true);
  };

  const updateDraftItem = (id: string, field: keyof MenuItem, value: string | number | MenuItem['availability']) => {
    setDraftItems((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const saveEditor = () => {
    if (!Number.isFinite(draftRules.minimumOrder) || draftRules.minimumOrder < 0) {
      setEditorError('Enter a non-negative minimum order amount.');
      setEditorTab('copy');
      return;
    }
    if (!Number.isFinite(draftRules.deliveryFee) || draftRules.deliveryFee < 0) {
      setEditorError('Enter a non-negative delivery estimate.');
      setEditorTab('copy');
      return;
    }
    if (!Number.isFinite(draftRules.taxRate) || draftRules.taxRate < 0 || draftRules.taxRate > 100) {
      setEditorError('Enter a tax estimate between 0% and 100%.');
      setEditorTab('copy');
      return;
    }
    if (!Number.isInteger(draftRules.maxPerItem) || draftRules.maxPerItem < 1 || draftRules.maxPerItem > 99) {
      setEditorError('Set the per-item demo limit to a whole number from 1 to 99.');
      setEditorTab('copy');
      return;
    }
    const nextOverrides: Record<string, ItemOverride> = {};
    for (const published of menuItems) {
      const draft = draftItems[published.id];
      if (!draft) continue;
      if (!draft.name.trim() || !draft.category.trim()) {
        setEditorError(`Add a name and category for ${published.name}.`);
        return;
      }
      if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) {
        setEditorError(`Enter a non-negative price for ${draft.name}.`);
        return;
      }
      const changed: ItemOverride = {};
      if (draft.name !== published.name) changed.name = draft.name.trim();
      if (draft.description !== published.description) changed.description = draft.description.trim();
      if (draft.category !== published.category) changed.category = draft.category.trim();
      if (Number(draft.price) !== published.price) changed.price = Number(draft.price);
      if (draft.availability !== published.availability) changed.availability = draft.availability;
      if (Object.keys(changed).length) nextOverrides[published.id] = changed;
    }
    const nextCopyOverrides: Partial<LocalCopy> = {};
    (Object.keys(defaultCopy) as Array<keyof LocalCopy>).forEach((key) => {
      if (draftCopy[key] !== defaultCopy[key]) nextCopyOverrides[key] = draftCopy[key];
    });
    const nextRulesOverrides: Partial<LocalRules> = {};
    (Object.keys(defaultRules) as Array<keyof LocalRules>).forEach((key) => {
      if (draftRules[key] !== defaultRules[key]) nextRulesOverrides[key] = draftRules[key];
    });
    try {
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(nextOverrides));
      localStorage.setItem(COPY_KEY, JSON.stringify(nextCopyOverrides));
      localStorage.setItem(RULES_KEY, JSON.stringify(nextRulesOverrides));
    } catch {
      setEditorError('Could not save local edits in this browser. Check available device storage and try again.');
      return;
    }
    setOverrides(nextOverrides);
    setCopyOverrides(nextCopyOverrides);
    setRulesOverrides(nextRulesOverrides);
    setCart((current) => current
      .filter((entry) => draftItems[entry.itemId]?.availability === 'available')
      .map((entry) => ({ ...entry, quantity: Math.min(entry.quantity, draftRules.maxPerItem) })));
    setEditorOpen(false);
    setEditorError('');
  };

  const resetToPublished = () => {
    try {
      localStorage.removeItem(OVERRIDES_KEY);
      localStorage.removeItem(COPY_KEY);
      localStorage.removeItem(RULES_KEY);
    } catch {
      setEditorError('Could not clear local edits in this browser.');
      return;
    }
    setOverrides({});
    setCopyOverrides({});
    setRulesOverrides({});
    setDraftItems(Object.fromEntries(menuItems.map((item) => [item.id, { ...item }])));
    setDraftCopy({ ...defaultCopy });
    setDraftRules({ ...defaultRules });
    setEditorError('');
  };

  const changeQuantity = (itemId: string, delta: number) => {
    if (delta > 0 && itemMap.get(itemId)?.availability !== 'available') return;
    const selectedQuantity = cart.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
    if (delta > 0 && selectedQuantity >= rules.maxPerItem) {
      setQuantityNotice(`The demo limit is ${rules.maxPerItem} of each menu item.`);
      return;
    }
    setQuantityNotice('');
    setCart((current) => {
      const found = current.find((entry) => entry.itemId === itemId);
      if (delta > 0 && (found?.quantity ?? 0) >= rules.maxPerItem) return current;
      if (!found && delta > 0) return [...current, { itemId, quantity: 1 }];
      return current.map((entry) => entry.itemId === itemId ? { ...entry, quantity: entry.quantity + delta } : entry)
        .filter((entry) => entry.quantity > 0);
    });
  };

  const handlePhoto = async (itemId: string, file?: File) => {
    setPhotoError((current) => ({ ...current, [itemId]: '' }));
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError((current) => ({ ...current, [itemId]: 'Choose an image file.' }));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError((current) => ({ ...current, [itemId]: 'Image must be 8 MB or smaller.' }));
      return;
    }
    try {
      await writePhoto(itemId, file);
      const previousUrl = photoUrlsRef.current[itemId];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const nextUrls = { ...photoUrlsRef.current, [itemId]: URL.createObjectURL(file) };
      photoUrlsRef.current = nextUrls;
      setPhotoUrls(nextUrls);
      setIdbError(false);
    } catch {
      setIdbError(true);
      setPhotoError((current) => ({ ...current, [itemId]: 'Could not save this photo on the device.' }));
    }
  };

  const removePhoto = async (itemId: string) => {
    try {
      await writePhoto(itemId, null);
      const previousUrl = photoUrlsRef.current[itemId];
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      const nextUrls = { ...photoUrlsRef.current };
      delete nextUrls[itemId];
      photoUrlsRef.current = nextUrls;
      setPhotoUrls(nextUrls);
      setPhotoError((current) => ({ ...current, [itemId]: '' }));
    } catch { setIdbError(true); }
  };

  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (customerName.trim().length < 2) next.customerName = 'Please enter your name.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) next.phone = 'Enter a valid phone number.';
    if (fulfillment === 'delivery' && address.trim().length < 6) next.address = 'Please enter a complete delivery address.';
    if (budget.trim() && (!Number.isFinite(Number(budget)) || Number(budget) <= 0)) next.budget = 'Enter a valid budget amount.';
    if (subtotal < rules.minimumOrder) next.cart = `The minimum set on this device is ${money(rules.minimumOrder)} before tax.`;
    if (exceedsBudget) next.budget = 'Your current total is above this budget. Adjust your order or budget to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startCheckout = () => {
    setCheckoutOpen(true);
    setStep(1);
    setErrors({});
  };

  const goToReview = () => {
    if (validateDetails()) setStep(2);
  };

  const confirmDemoOrder = () => {
    const demoOrder: DemoOrder = {
      id: `MIS-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      fulfillment,
      customerName: customerName.trim(),
      phone: phone.trim(),
      ...(fulfillment === 'delivery' ? { address: address.trim() } : {}),
      items: cart.map(({ itemId, quantity }) => ({ itemId, quantity })),
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      deliveryFee,
      total,
      ...(specialRequests.trim() ? { specialRequests: specialRequests.trim() } : {}),
    };
    try { localStorage.setItem('misaki-last-demo-order', JSON.stringify(demoOrder)); } catch { /* Keep the confirmation visible even if storage is unavailable. */ }
    setOrder(demoOrder);
    setStoredOrder(demoOrder);
    setCart([]);
    setCheckoutOpen(false);
  };

  const beginFreshOrder = () => {
    setOrder(null);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setBudget('');
    setSpecialRequests('');
    setErrors({});
  };

  const scrollToCart = () => document.getElementById('cart-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const orderForReceipt = order ?? storedOrder;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Misaki Ordering home" data-testid="link-home">
          <span className="brand-mark" aria-hidden="true">美</span>
          <span><span className="brand-name">{copy.brandName}</span><span className="brand-caption">{copy.locationCaption}</span></span>
        </a>
        <div className="topbar-right">
          <span><MapPin size={15} /> {copy.topbarLocation}</span>
          <span><Clock3 size={15} /> {copy.topbarStatus}</span>
          <button className="cart-jump" onClick={scrollToCart} data-testid="button-view-cart" aria-label={`View cart, ${cartCount} items`}>
            <ShoppingBag size={16} /> Your order <span className="cart-count" data-testid="text-cart-count">{cartCount}</span>
          </button>
          <button className="editor-launch" type="button" onClick={openEditor} data-testid="button-open-editor"><Pencil size={14} /> Edit menu</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="eyebrow">{copy.heroEyebrow}</div>
            <h1>{copy.heroHeading.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</h1>
            <p>{copy.heroDescription}</p>
          </div>
          <div className="hero-note">{copy.heroNote.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</div>
        </div>
      </section>

      <main className="content-wrap">
        {orderForReceipt && (
          <section className="confirm-card" data-testid="status-last-order">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: '#1c2954', display: 'flex', gap: 8, alignItems: 'center' }}><Check size={17} /> {order ? 'Demo order saved on this device' : 'Your last demo order'}</strong>
                <div style={{ color: '#5c6378', fontSize: 12, marginTop: 5 }}>{orderForReceipt.id} · {fulfillmentLabel[orderForReceipt.fulfillment]} · {money(orderForReceipt.total)}</div>
              </div>
              <button className="plain-btn" onClick={beginFreshOrder} data-testid="button-start-new-order">Start a new order</button>
            </div>
            <div className="demo-callout">This prototype does not send orders to the restaurant or process payment. This demo record is saved locally on this device only.</div>
          </section>
        )}

        <section className="fulfillment-bar" aria-label="Choose how to enjoy your order">
          <div className="fulfillment-title">How would you like it?</div>
          <div className="fulfillment-options">
            {([
              { id: 'pickup' as const, label: 'Pickup', Icon: Store },
              { id: 'delivery' as const, label: 'Delivery', Icon: Truck },
              { id: 'dine-in' as const, label: 'Dine-in', Icon: Utensils },
            ]).map(({ id, label, Icon }) => (
              <button key={id} type="button" className={`fulfillment-option${fulfillment === id ? ' active' : ''}`}
                aria-pressed={fulfillment === id} onClick={() => setFulfillment(id)} data-testid={`button-fulfillment-${id}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="fulfillment-hint">{fulfillment === 'delivery' ? `${money(rules.deliveryFee)} demo delivery estimate · ${copy.deliveryHint}` : fulfillment === 'dine-in' ? copy.dineInHint : copy.pickupHint}</div>
        </section>

        <div className="browse-layout">
          <section className="browse-main" aria-label="Menu">
            <div className="menu-heading">
              <div><h2>{copy.menuHeading}</h2><p>{copy.menuDescription}</p></div>
              <label className="search-box"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes…" aria-label="Search menu" data-testid="input-menu-search" /></label>
            </div>
            <div className="category-tabs" role="tablist" aria-label="Menu categories">
              {categories.map((itemCategory) => (
                <button type="button" key={itemCategory} role="tab" aria-selected={category === itemCategory}
                  className={`category-tab${category === itemCategory ? ' active' : ''}`} onClick={() => setCategory(itemCategory)}
                  data-testid={`button-category-${itemCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                  {itemCategory === 'All items' ? 'All items' : itemCategory}
                </button>
              ))}
              <span className="menu-count" data-testid="text-menu-result-count">{visibleItems.length} items</span>
            </div>
            {category.toLocaleLowerCase().includes('sake') && (
              <div className="sake-warning" role="note" data-testid="status-sake-age-restriction">
                <strong>Age-restricted menu · 21+ only.</strong> Alcohol sales require valid ID and applicable local law. This prototype cannot verify age, accept payment, or process a real alcohol sale.
              </div>
            )}
            <div className="menu-safety" role="note" data-testid="notice-menu-safety">
              Some dishes contain raw or undercooked ingredients, and menu descriptions may not list every ingredient. Contact Misaki directly about allergies, modifications, or current availability.
            </div>
            <div className="menu-grid" data-testid="list-menu-items">
              {visibleItems.length === 0 && (
                <div className="no-results" data-testid="status-no-menu-results"><Search size={24} /><strong>No dishes found</strong>Try another name or category.</div>
              )}
              {visibleItems.map((item) => {
                const quantity = cart.find((entry) => entry.itemId === item.id)?.quantity ?? 0;
                return (
                  <article className="menu-card" key={item.id} data-testid={`card-menu-item-${item.id}`}>
                    <div className="photo-slot">
                      {photoUrls[item.id] ? <img src={photoUrls[item.id]} alt={`${item.name} local menu photo`} data-testid={`img-menu-photo-${item.id}`} /> :
                        <div className="photo-art"><ImagePlus size={21} /><span>Add a photo</span></div>}
                      <input className="photo-input" type="file" accept="image/*" ref={(node) => { fileRefs.current[item.id] = node; }}
                        onChange={(event) => { void handlePhoto(item.id, event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}
                        aria-label={`Choose photo for ${item.name}`} data-testid={`input-photo-${item.id}`} />
                      <div className="photo-actions">
                        <button className="photo-btn" type="button" onClick={() => fileRefs.current[item.id]?.click()} data-testid={`button-photo-${photoUrls[item.id] ? 'change' : 'upload'}-${item.id}`}>
                          {photoUrls[item.id] ? 'Change' : 'Upload'}
                        </button>
                        {photoUrls[item.id] && <button className="photo-btn remove" type="button" onClick={() => void removePhoto(item.id)} data-testid={`button-photo-remove-${item.id}`}>Remove</button>}
                      </div>
                    </div>
                    <div className="item-info">
                      <div className="item-topline"><h3 className="item-name">{item.name}</h3><span className="item-price" data-testid={`text-price-${item.id}`}>{money(item.price)}</span></div>
                      {item.description && <p className="item-desc">{item.description}</p>}
                      <div className="item-bottom">
                        <span className="item-category">{item.category}</span>
                        {item.availability === 'unavailable' ?
                          <span className="soldout" data-testid={`status-unavailable-${item.id}`}>Sold out</span> :
                          quantity > 0 ?
                            <div className="qty-control" aria-label={`${item.name} quantity`}>
                              <button onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`} data-testid={`button-decrease-${item.id}`}><Minus size={13} /></button>
                              <span data-testid={`text-quantity-${item.id}`}>{quantity}</span>
                               <button disabled={quantity >= rules.maxPerItem} onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`} title={quantity >= rules.maxPerItem ? `Demo limit: ${rules.maxPerItem} per item` : undefined} data-testid={`button-increase-${item.id}`}><Plus size={13} /></button>
                            </div> :
                            <button className="add-button" type="button" onClick={() => changeQuantity(item.id, 1)} data-testid={`button-add-${item.id}`}><Plus size={13} /> Add</button>}
                      </div>
                      {photoError[item.id] && <span className="error-msg" role="alert" data-testid={`status-photo-error-${item.id}`}>{photoError[item.id]}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="cart-panel" id="cart-panel" aria-label="Your order">
            <div className="cart-panel-head"><h3>Your order</h3><span data-testid="text-order-item-count">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span></div>
            {cart.length === 0 ? (
              <div className="cart-empty" data-testid="status-cart-empty"><div className="empty-mark"><ShoppingBag size={20} /></div><strong>Your table is waiting</strong><p>Pick something delicious from the menu to get started.</p></div>
            ) : (
              <div className="cart-items">
                {cart.map((entry) => {
                  const item = itemMap.get(entry.itemId);
                  if (!item) return null;
                  return <div className="cart-row" key={entry.itemId} data-testid={`row-cart-item-${entry.itemId}`}>
                    <div><div className="cart-row-name">{item.name}</div><div className="cart-row-price">{money(item.price)} each · {money(item.price * entry.quantity)}</div></div>
                    <div className="qty-control"><button onClick={() => changeQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`} data-testid={`button-cart-decrease-${item.id}`}><Minus size={13} /></button><span>{entry.quantity}</span><button disabled={entry.quantity >= rules.maxPerItem} onClick={() => changeQuantity(item.id, 1)} aria-label={`Add one ${item.name}`} title={entry.quantity >= rules.maxPerItem ? `Demo limit: ${rules.maxPerItem} per item` : undefined} data-testid={`button-cart-increase-${item.id}`}><Plus size={13} /></button></div>
                  </div>;
                })}
              </div>
            )}
            <div className="totals">
              <div className="total-line"><span>Subtotal</span><span data-testid="text-subtotal">{money(subtotal)}</span></div>
              <div className="total-line"><span>Estimated tax (demo rate)</span><span data-testid="text-tax">{money(tax)}</span></div>
              {fulfillment === 'delivery' && <div className="total-line"><span>Delivery fee (demo estimate)</span><span data-testid="text-delivery-fee">{money(deliveryFee)}</span></div>}
              <div className="total-line total"><span>Total</span><span data-testid="text-total">{money(total)}</span></div>
            </div>
            <div className={`min-notice${subtotal >= rules.minimumOrder ? ' met' : ''}`} data-testid="status-order-minimum">
              {subtotal >= rules.minimumOrder ? <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Minimum met · local minimum is {money(rules.minimumOrder)} before tax</> :
                <>Local minimum is {money(rules.minimumOrder)} before tax. Add {money(rules.minimumOrder - subtotal)} to continue.</>}
            </div>
            <p className="quantity-cap-note">Demo order limit: up to {rules.maxPerItem} of each available menu item.</p>
            {quantityNotice && <div className="error-msg" role="status" data-testid="status-quantity-limit">{quantityNotice}</div>}
            {errors.cart && <div className="error-msg" role="alert" data-testid="status-cart-error">{errors.cart}</div>}
            <button className="checkout-button" disabled={cart.length === 0 || subtotal < rules.minimumOrder} onClick={startCheckout} data-testid="button-checkout">
              Continue to checkout <ChevronRight size={16} />
            </button>
            <p className="photo-note"><ImagePlus size={14} /> Menu photos you add are stored privately on this device only, in your browser.</p>
            {idbError && <p className="error-msg" role="status" data-testid="status-photo-storage-error">Device photo storage is unavailable in this browser.</p>}
          </aside>
        </div>
      </main>

      <footer className="footer">
        <span>{copy.footerRestaurant} · <a href="https://www.misakiatsuperior.com/online-ordering-1" target="_blank" rel="noreferrer" data-testid="link-official-menu">View the official menu</a></span>
        <span>{copy.footerInstallNote}</span>
      </footer>

      {cart.length > 0 && <div className="mobile-cart-bar">
        <div><span>{cartCount} {cartCount === 1 ? 'item' : 'items'} in your order</span><br /><strong>{money(total)}</strong></div>
        <button onClick={scrollToCart} data-testid="button-mobile-view-cart">View order <ChevronRight size={14} /></button>
      </div>}

      {editorOpen && <div className="overlay editor-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}>
        <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" data-testid="dialog-local-editor">
          <div className="editor-head">
            <div>
              <div className="eyebrow editor-eyebrow">This device only</div>
              <h2 id="editor-title">Menu &amp; shop details</h2>
              <p>Changes stay in this browser. The published Misaki catalog is never changed.</p>
            </div>
            <button className="close-btn" type="button" aria-label="Close editor" onClick={() => setEditorOpen(false)} data-testid="button-close-editor"><X size={18} /></button>
          </div>
           <div className="editor-tabs" role="tablist" aria-label="Editor sections">
            <button type="button" role="tab" aria-selected={editorTab === 'menu'} className={editorTab === 'menu' ? 'active' : ''} onClick={() => setEditorTab('menu')} data-testid="tab-edit-menu">Menu items <span>{items.length}</span></button>
             <button type="button" role="tab" aria-selected={editorTab === 'copy'} className={editorTab === 'copy' ? 'active' : ''} onClick={() => setEditorTab('copy')} data-testid="tab-edit-copy">Shop details</button>
          </div>
          {editorTab === 'menu' ? <>
            <div className="editor-toolbar">
              <label className="search-box editor-search"><Search size={15} /><input value={editorSearch} onChange={(event) => setEditorSearch(event.target.value)} placeholder="Find a dish to edit" aria-label="Search editor menu" data-testid="input-editor-search" /></label>
              <span className="editor-local-label">Local override</span>
            </div>
            <div className="editor-list" data-testid="list-editor-items">
              {Object.values(draftItems).filter((item) => `${item.name} ${item.category}`.toLocaleLowerCase().includes(editorSearch.trim().toLocaleLowerCase())).map((item) => (
                <article className="editor-item" key={item.id} data-testid={`editor-item-${item.id}`}>
                  <div className="editor-item-top">
                    <div><strong>{item.name}</strong><span>{item.id} · Published: {item.sourceName}</span></div>
                    <label className={`availability-toggle${item.availability === 'available' ? ' available' : ''}`}>
                      <input type="checkbox" checked={item.availability === 'available'} onChange={(event) => updateDraftItem(item.id, 'availability', event.target.checked ? 'available' : 'unavailable')} data-testid={`input-availability-${item.id}`} />
                      <span>{item.availability === 'available' ? 'Available' : 'Sold out'}</span>
                    </label>
                  </div>
                  <div className="editor-fields">
                    <label>Name<input value={item.name} onChange={(event) => updateDraftItem(item.id, 'name', event.target.value)} data-testid={`input-editor-name-${item.id}`} /></label>
                    <label>Category<input value={item.category} onChange={(event) => updateDraftItem(item.id, 'category', event.target.value)} data-testid={`input-editor-category-${item.id}`} /></label>
                    <label>Price<input type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateDraftItem(item.id, 'price', event.target.value === '' ? Number.NaN : Number(event.target.value))} data-testid={`input-editor-price-${item.id}`} /></label>
                    <label className="editor-description">Description<textarea value={item.description} onChange={(event) => updateDraftItem(item.id, 'description', event.target.value)} data-testid={`input-editor-description-${item.id}`} /></label>
                  </div>
                  <div className="editor-source">Published wording: “{item.sourceDescription || 'No description'}”</div>
                </article>
              ))}
            </div>
           </> : <div className="copy-editor" data-testid="form-editor-copy">
             <p className="copy-editor-intro">Edit the visible restaurant copy and local order estimates. These details only change on this device.</p>
            <label>Restaurant name<input value={draftCopy.brandName} onChange={(event) => setDraftCopy((current) => ({ ...current, brandName: event.target.value }))} data-testid="input-copy-brand-name" /></label>
            <label>Location caption<input value={draftCopy.locationCaption} onChange={(event) => setDraftCopy((current) => ({ ...current, locationCaption: event.target.value }))} data-testid="input-copy-location" /></label>
             <label>Top bar location<input value={draftCopy.topbarLocation} onChange={(event) => setDraftCopy((current) => ({ ...current, topbarLocation: event.target.value }))} data-testid="input-copy-topbar-location" /></label>
             <label>Top bar note<input value={draftCopy.topbarStatus} onChange={(event) => setDraftCopy((current) => ({ ...current, topbarStatus: event.target.value }))} data-testid="input-copy-topbar-status" /></label>
             <label>Pickup note<input value={draftCopy.pickupHint} onChange={(event) => setDraftCopy((current) => ({ ...current, pickupHint: event.target.value }))} data-testid="input-copy-pickup-hint" /></label>
             <label>Delivery note<input value={draftCopy.deliveryHint} onChange={(event) => setDraftCopy((current) => ({ ...current, deliveryHint: event.target.value }))} data-testid="input-copy-delivery-hint" /></label>
             <label>Dine-in note<input value={draftCopy.dineInHint} onChange={(event) => setDraftCopy((current) => ({ ...current, dineInHint: event.target.value }))} data-testid="input-copy-dine-in-hint" /></label>
             <label>Hero eyebrow<input value={draftCopy.heroEyebrow} onChange={(event) => setDraftCopy((current) => ({ ...current, heroEyebrow: event.target.value }))} data-testid="input-copy-hero-eyebrow" /></label>
            <label>Hero heading<textarea rows={2} value={draftCopy.heroHeading} onChange={(event) => setDraftCopy((current) => ({ ...current, heroHeading: event.target.value }))} data-testid="input-copy-hero-heading" /></label>
            <label>Hero description<textarea rows={3} value={draftCopy.heroDescription} onChange={(event) => setDraftCopy((current) => ({ ...current, heroDescription: event.target.value }))} data-testid="input-copy-hero-description" /></label>
            <label>Hero note<textarea rows={2} value={draftCopy.heroNote} onChange={(event) => setDraftCopy((current) => ({ ...current, heroNote: event.target.value }))} data-testid="input-copy-hero-note" /></label>
             <label>Menu heading<input value={draftCopy.menuHeading} onChange={(event) => setDraftCopy((current) => ({ ...current, menuHeading: event.target.value }))} data-testid="input-copy-menu-heading" /></label>
             <label>Menu introduction<textarea rows={2} value={draftCopy.menuDescription} onChange={(event) => setDraftCopy((current) => ({ ...current, menuDescription: event.target.value }))} data-testid="input-copy-menu-description" /></label>
             <label>Footer restaurant line<input value={draftCopy.footerRestaurant} onChange={(event) => setDraftCopy((current) => ({ ...current, footerRestaurant: event.target.value }))} data-testid="input-copy-footer-restaurant" /></label>
             <label>Footer install note<textarea rows={2} value={draftCopy.footerInstallNote} onChange={(event) => setDraftCopy((current) => ({ ...current, footerInstallNote: event.target.value }))} data-testid="input-copy-footer-install-note" /></label>
             <section className="editor-rules" aria-labelledby="editor-rules-title">
               <h3 id="editor-rules-title">Local order estimates</h3>
               <div className="editor-fields">
                 <label>Minimum before tax ($)<input type="number" min="0" step="0.01" value={draftRules.minimumOrder} onChange={(event) => setDraftRules((current) => ({ ...current, minimumOrder: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} data-testid="input-rule-minimum" /></label>
                 <label>Tax estimate (%)<input type="number" min="0" max="100" step="0.01" value={draftRules.taxRate} onChange={(event) => setDraftRules((current) => ({ ...current, taxRate: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} data-testid="input-rule-tax" /></label>
                 <label>Delivery estimate ($)<input type="number" min="0" step="0.01" value={draftRules.deliveryFee} onChange={(event) => setDraftRules((current) => ({ ...current, deliveryFee: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} data-testid="input-rule-delivery" /></label>
                 <label>Demo limit per item<input type="number" min="1" max="99" step="1" value={draftRules.maxPerItem} onChange={(event) => setDraftRules((current) => ({ ...current, maxPerItem: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} data-testid="input-rule-max-per-item" /></label>
               </div>
               <p>Tax, delivery, and minimum-order figures are estimates for this demo only. They do not change Misaki’s actual prices or policies.</p>
             </section>
          </div>}
          {editorError && <div className="editor-error" role="alert" data-testid="status-editor-error">{editorError}</div>}
          <div className="editor-actions">
            <button type="button" className="editor-reset" onClick={resetToPublished} data-testid="button-reset-published"><RotateCcw size={14} /> Reset to published</button>
            <div><button type="button" className="plain-btn" onClick={() => { setEditorOpen(false); setEditorError(''); }} data-testid="button-cancel-editor">Cancel</button><button type="button" className="editor-save" onClick={saveEditor} data-testid="button-save-editor"><Save size={15} /> Save on this device</button></div>
          </div>
        </section>
      </div>}

      {checkoutOpen && <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCheckoutOpen(false); }}>
        <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" data-testid="dialog-checkout">
          {order ? <div className="success-view">
            <div className="success-icon"><Check size={29} /></div><h2>Thank you, {order.customerName}.</h2>
            <p>Your demo order has been saved locally. Nothing was sent to the restaurant and no payment was taken.</p>
            <div className="order-id" data-testid="text-demo-order-id">{order.id}</div>
            <div className="demo-callout">Demo only · this is not a real restaurant order confirmation.</div>
          </div> : <>
            <div className="modal-head"><div><div className="eyebrow" style={{ color: '#8f6410', marginBottom: 8 }}>Almost there</div><h2 id="checkout-title">{step === 1 ? 'Your details' : 'Review your order'}</h2><p>{step === 1 ? 'A few details, then one last look.' : 'Please check everything before saving your demo order.'}</p></div>
              <button className="close-btn" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)} data-testid="button-close-checkout"><X size={18} /></button></div>
            <div className="step-indicator"><span className="step-pill active" /><span className={`step-pill${step === 2 ? ' active' : ''}`} /></div>
            {step === 1 ? <>
              <div className="form-grid">
                <div className="field"><label htmlFor="customer-name">Your name *</label><input id="customer-name" autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Name for the order" data-testid="input-customer-name" />{errors.customerName && <span className="error-msg" data-testid="error-customer-name">{errors.customerName}</span>}</div>
                <div className="field"><label htmlFor="customer-phone">Phone number *</label><input id="customer-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(303) 555-0123" data-testid="input-customer-phone" />{errors.phone && <span className="error-msg" data-testid="error-customer-phone">{errors.phone}</span>}</div>
                {fulfillment === 'delivery' && <div className="field full"><label htmlFor="delivery-address">Delivery address *</label><input id="delivery-address" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street, city, ZIP" data-testid="input-delivery-address" />{errors.address && <span className="error-msg" data-testid="error-delivery-address">{errors.address}</span>}</div>}
                <div className="field"><label htmlFor="budget">Optional budget</label><input id="budget" type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="No limit" data-testid="input-budget" /><span className="field-hint">We’ll flag the total if it goes over.</span>{errors.budget && <span className="error-msg" data-testid="error-budget">{errors.budget}</span>}</div>
                <div className="field"><label htmlFor="special-requests">Special requests</label><textarea id="special-requests" value={specialRequests} onChange={(event) => setSpecialRequests(event.target.value)} placeholder="Anything we should know?" data-testid="input-special-requests" /></div>
              </div>
              {exceedsBudget && <div className="budget-alert" role="status" data-testid="status-budget-exceeded">Your estimated total of {money(total)} is above your {money(budgetNumber ?? 0)} budget.</div>}
              <div className="modal-actions"><button className="plain-btn" onClick={() => setCheckoutOpen(false)} data-testid="button-cancel-checkout">Keep browsing</button><button className="checkout-button secondary" style={{ width: 'auto' }} onClick={goToReview} data-testid="button-review-order">Review order <ChevronRight size={15} /></button></div>
            </> : <>
              <div className="confirm-card">
                <div className="review-meta"><div><span>Fulfillment</span><strong>{fulfillmentLabel[fulfillment]}</strong></div><div><span>Order for</span><strong>{customerName}</strong></div><div><span>Phone</span><strong>{phone}</strong></div>{fulfillment === 'delivery' && <div><span>Deliver to</span><strong>{address}</strong></div>}</div>
                {cart.map((entry) => {
                  const item = itemMap.get(entry.itemId);
                  return item ? <div className="review-line" key={entry.itemId} data-testid={`row-review-item-${item.id}`}><span>{entry.quantity} × {item.name}</span><strong>{money(item.price * entry.quantity)}</strong></div> : null;
                })}
                {specialRequests.trim() && <div className="review-line"><span>Special request</span><strong>{specialRequests}</strong></div>}
                <div className="review-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div className="review-line"><span>Estimated tax</span><strong>{money(tax)}</strong></div>
                {fulfillment === 'delivery' && <div className="review-line"><span>Delivery fee</span><strong>{money(deliveryFee)}</strong></div>}
                <div className="review-line" style={{ fontSize: 15 }}><strong>Estimated total</strong><strong>{money(total)}</strong></div>
                {cart.some((entry) => itemMap.get(entry.itemId)?.category.toLocaleLowerCase().includes('sake')) && <div className="age-notice">Includes age-restricted alcohol. 21+ only; valid ID and applicable law apply. This demo cannot verify age or process a real alcohol sale.</div>}
              </div>
              <div className="demo-callout"><strong>Demo order only.</strong> This prototype does not send the order to Misaki, reserve a table, arrange delivery, or accept payment. Confirming saves a local record on this device only.</div>
              <div className="modal-actions"><button className="plain-btn" onClick={() => setStep(1)} data-testid="button-back-to-details">Back to details</button><button className="checkout-button" style={{ width: 'auto' }} onClick={confirmDemoOrder} data-testid="button-confirm-demo-order">Save demo order <Check size={15} /></button></div>
            </>}
          </>}
        </section>
      </div>}
    </div>
  );
}

export default App;