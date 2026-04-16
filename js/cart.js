import CONFIG from './config.js';

let cart = JSON.parse(localStorage.getItem(CONFIG.CART_STORAGE_KEY)) || [];

export const getCart = () => cart;

export const addToCart = (item) => {
    // Each item in cart needs a unique ID because the same menu item can have different options
    const instanceId = Date.now() + Math.random().toString(36).substr(2, 9);
    const cartItem = {
        ...item,
        instanceId,
        quantity: item.quantity || 1
    };
    cart.push(cartItem);
    saveCart();
    return cartItem;
};

export const removeFromCart = (instanceId) => {
    cart = cart.filter(item => item.instanceId !== instanceId);
    saveCart();
};

export const updateQuantity = (instanceId, delta) => {
    const item = cart.find(i => i.instanceId === instanceId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(instanceId);
        } else {
            saveCart();
        }
    }
};

export const clearCart = () => {
    cart = [];
    saveCart();
};

const saveCart = () => {
    localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(cart));
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
};

export const calculateTotals = (settings = { delivery_fee: 0, tax_percentage: 0 }, coupon = null) => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let discountAmount = 0;
    const minAmount = coupon ? (coupon.minimum_order_amount || coupon.min_order_amount || 0) : 0;

    if (coupon && subtotal >= minAmount) {
        const discountValue = parseFloat(coupon.discount_value || 0);
        if (coupon.discount_type === 'fixed') {
            discountAmount = discountValue;
        } else if (coupon.discount_type === 'percentage') {
            discountAmount = subtotal * (discountValue / 100);
        }
    }

    // Default to true if the settings object exists but is missing the 'is_enabled' flags
    const isDeliveryEnabled = settings.is_delivery_enabled !== false && ('delivery_fee' in settings);
    const isTaxEnabled = settings.is_tax_enabled !== false && ('tax_percentage' in settings);

    const deliveryFee = isDeliveryEnabled ? parseFloat(settings.delivery_fee || 0) : 0;
    const taxAmount = isTaxEnabled ? (subtotal * (parseFloat(settings.tax_percentage || 0) / 100)) : 0;
    const total = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

    console.log('Order Payload Calculation:', { subtotal, discountAmount, deliveryFee, taxAmount, total });

    return {
        subtotal,
        discountAmount,
        deliveryFee,
        taxAmount,
        total: Math.max(0, total)
    };
};
