import CONFIG from './config.js';

// Setup Supabase Client
// We use the CDN directly in index.html, so we assume `supabase` is available globally
// Or we can import it if we use a module system, but for vanilla JS, we'll use the window.supabase

const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export const fetchRestaurantData = async () => {
    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', CONFIG.RESTAURANT_ID)
        .single();
    if (error) throw error;
    return data;
};

export const fetchCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
};

export const fetchMenuItems = async () => {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*, menu_item_groups(*, menu_item_group_options(*))')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('is_active', true);
    if (error) throw error;
    return data;
};

export const fetchDeals = async () => {
    const { data, error } = await supabase
        .from('deals')
        .select('*, deal_groups(*, deal_group_items(*, menu_items(*)))')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
};

export const fetchActiveMessages = async () => {
    const today = new Date().toISOString();
    const { data, error } = await supabase
        .from('restaurant_messages')
        .select('*')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('is_active', true)
        .or(`display_until.gt.${today},display_until.is.null`)
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
};

export const fetchOrderSettings = async () => {
    console.log("Fetching order settings for:", CONFIG.RESTAURANT_ID);
    const { data, error } = await supabase
        .from('order_settings')
        .select('*')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID);

    if (error) {
        console.error("Order Settings Fetch Error:", error);
    }

    if (!data || data.length === 0) {
        console.warn("No settings found for current ID. Performing broad search for diagnostics...");
        const { data: anySettings } = await supabase.from('order_settings').select('restaurant_id').limit(1);
        if (anySettings && anySettings.length > 0) {
            console.error("SUGGESTION: Found settings but for ID:", anySettings[0].restaurant_id);
        }
        return { delivery_fee: 0, tax_percentage: 0 };
    }

    console.log("Found Order Settings:", data[0]);
    return data[0];
};

export const createOrder = async (orderData) => {
    const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();
    if (error) throw error;
    return data[0];
};

export const createOrderItems = async (orderItems) => {
    const { data, error } = await supabase
        .from('order_items')
        .insert(orderItems);
    if (error) throw error;
    return data;
};

export const fetchCustomerByPhone = async (phone) => {
    const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('mobile_number', phone)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') console.error("Customer Fetch Error:", error);
    return data;
};

export const createCustomer = async (customerData) => {
    const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, restaurant_id: CONFIG.RESTAURANT_ID }])
        .select('id')
        .single();
    if (error) throw error;
    return data;
};

export const fetchCouponByCode = async (code) => {
    console.log(`Searching for coupon: ${code} for restaurant: ${CONFIG.RESTAURANT_ID}`);
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('code', code.toUpperCase())
        .eq('is_active', true);

    if (error) {
        console.error("Coupon Fetch Error:", error);
        return null;
    }

    if (!data || data.length === 0) {
        const { data: anyCoupon } = await supabase.from('coupons').select('restaurant_id').eq('code', code.toUpperCase()).limit(1);
        if (anyCoupon && anyCoupon.length > 0) {
            console.error("COUPON FOUND BUT FOR DIFFERENT RESTAURANT ID:", anyCoupon[0].restaurant_id);
        }
        return null;
    }

    console.log("Coupon Query Result:", data[0]);
    return data[0];
};

export const incrementCouponUsage = async (couponId) => {
    // First get current count
    const { data: coupon } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('id', couponId)
        .single();

    const currentCount = coupon?.usage_count || 0;

    const { error } = await supabase
        .from('coupons')
        .update({ usage_count: currentCount + 1 })
        .eq('restaurant_id', CONFIG.RESTAURANT_ID)
        .eq('id', couponId);

    if (error) {
        console.error("Failed to increment coupon usage:", error.message);
    }
};

export default supabase;
