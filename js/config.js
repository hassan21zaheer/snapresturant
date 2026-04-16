// CONFIGURATION - Change these values to deploy for a new restaurant
const CONFIG = {

    // Supabase Credentials
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    // WARNING: For production, use the ANON_KEY and configure Row Level Security (RLS)
    SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

    // Restaurant Identity
    RESTAURANT_ID: import.meta.env.VITE_RESTAURANT_ID,
    RESTAURANT_NAME: 'SNAP', // Fallback name
    RESTAURANT_PHONE: '+9242111117627',
    RESTAURANT_ADDRESS: 'Snap - Vertical, Shop No 01, Vertical 02 Pine Ave, Block B Khayaban E Ameen, Lahore',
    OPENING_DAYS: 'Monday - Sunday',
    OPENING_HOURS: '12:00 PM - 03:00 AM',

    // UI Settings
    THEME_COLOR: 'rgb(99, 32, 226);', // Purple
    SECONDARY_COLOR: '#F3E8FF',
    ACCENT_COLOR: '#3B82F6', // Blue for buttons

    // Hardcoded Texts/Settings (as per request)
    LOCATION_TEXT: 'Audit & Accounts Training Institute, Lahore',
    CURRENCY_SYMBOL: 'RS.',

    // Asset Paths
    LOGO_PATH: 'assets/images/logo.png',
    SLIDER_IMAGES: [
        'assets/images/slider1.png',
        'assets/images/slider2.jpg',
        'assets/images/slider3.png'
    ],

    // LocalStorage Keys
    CART_STORAGE_KEY: 'orderwebsite_cart'
};

export default CONFIG;
