import CONFIG from './config.js';
import * as api from './supabase-client.js';
import * as cartMgr from './cart.js';

// STATE
let appState = {
    restaurant: null,
    categories: [],
    menuItems: [],
    deals: [],
    messages: [],
    settings: { delivery_fee: 0, tax_percentage: 0 },
    activeCategory: 'deals',
    selectedItem: null,
    selectedDeal: null,
    coupon: null,
    bannerInterval: null
};

// ELEMENTS
const elements = {
    notificationBanner: document.getElementById('notification-banner'),
    bannerMessage: document.getElementById('banner-message'),
    closeBanner: document.getElementById('close-banner'),
    logoImg: document.getElementById('logo-img'),
    cartBadge: document.getElementById('cart-badge'),
    cartToggle: document.getElementById('cart-toggle'),
    cartSidebar: document.getElementById('cart-sidebar'),
    closeSidebar: document.getElementById('close-sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    categoryTabs: document.getElementById('category-tabs'),
    menuSections: document.getElementById('menu-sections'),
    menuSearch: document.getElementById('menu-search'),
    itemModal: document.getElementById('item-modal'),
    modalBody: document.getElementById('item-modal-body'),
    modalOverlay: document.getElementById('modal-overlay'),
    homeView: document.getElementById('home-view'),
    checkoutView: document.getElementById('checkout-view'),
    checkoutForm: document.getElementById('checkout-form'),
    backToMenu: document.getElementById('back-to-menu'),
    checkoutBtn: document.getElementById('checkout-btn'),
    cartItems: document.getElementById('cart-items'),
    cartSummary: document.getElementById('cart-summary'),
    checkoutCartItems: document.getElementById('checkout-cart-items'),
    checkoutTotals: document.getElementById('checkout-totals'),
    scrollLeft: document.getElementById('scroll-left'),
    scrollRight: document.getElementById('scroll-right')
};

// INITIALIZATION
async function init() {
    try {
        // Load data in parallel, but handle individual failures gracefully
        const results = await Promise.allSettled([
            api.fetchRestaurantData(),
            api.fetchCategories(),
            api.fetchMenuItems(),
            api.fetchDeals(),
            api.fetchActiveMessages(),
            api.fetchOrderSettings()
        ]);

        appState.restaurant = results[0].status === 'fulfilled' ? results[0].value : null;
        appState.categories = results[1].status === 'fulfilled' ? results[1].value : [];
        appState.menuItems = results[2].status === 'fulfilled' ? results[2].value : [];
        appState.deals = results[3].status === 'fulfilled' ? results[3].value : [];
        appState.messages = results[4].status === 'fulfilled' ? results[4].value : [];
        appState.settings = results[5].status === 'fulfilled' ? results[5].value : { delivery_fee: 0, tax_percentage: 0 };

        if (results[5].status === 'rejected') {
            console.error("Order Settings Load Failed:", results[5].reason);
        }

        console.log("Loaded Settings:", appState.settings);

        if (results.some(r => r.status === 'rejected')) {
            console.warn("Some data failed to load. Check your Supabase keys/permissions.");
        }

        renderHeader();
        renderBanner();
        renderHero();
        renderCategories();
        renderMenu();
        updateCartUI();
        initModalEvents();
        setupEventListeners();

    } catch (error) {
        console.error("Initialization failed:", error);
        // Fallback to minimal rendering so local assets appear
        renderHeader();
        renderHero();
        setupEventListeners();
    } finally {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }
}

function renderHeader() {
    const defaultLogo = CONFIG.LOGO_PATH || 'assets/images/logo.png';
    elements.logoImg.src = (appState.restaurant && appState.restaurant.logo) ? appState.restaurant.logo : defaultLogo;

    const footerLogo = document.getElementById('footer-logo');
    if (footerLogo) footerLogo.src = elements.logoImg.src;

    // Populate Footer Details
    const footerName = document.getElementById('footer-name');
    const footerPhone = document.getElementById('footer-phone');
    const footerAddress = document.getElementById('footer-address');
    const footerDays = document.getElementById('footer-days');
    const footerHours = document.getElementById('footer-hours');

    if (footerName) footerName.textContent = appState.restaurant ? appState.restaurant.name : CONFIG.RESTAURANT_NAME;
    if (footerPhone) footerPhone.textContent = CONFIG.RESTAURANT_PHONE;
    if (footerAddress) footerAddress.textContent = CONFIG.RESTAURANT_ADDRESS;
    if (footerDays) footerDays.textContent = CONFIG.OPENING_DAYS;
    if (footerHours) footerHours.textContent = CONFIG.OPENING_HOURS;

    if (appState.restaurant) {
        document.title = `${appState.restaurant.name} | Online Ordering`;
    }
}

function renderBanner() {
    // Clear any existing interval
    if (appState.bannerInterval) {
        clearInterval(appState.bannerInterval);
        appState.bannerInterval = null;
    }

    if (!appState.messages || appState.messages.length === 0) {
        elements.notificationBanner.classList.add('hidden');
        return;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');

    const activeMessages = appState.messages.filter(msg => {
        if (!msg.is_active) return false;
        if (msg.days_of_week && !msg.days_of_week.includes(currentDay)) return false;
        if (msg.start_time && currentTime < msg.start_time) return false;
        if (msg.end_time && currentTime > msg.end_time) return false;
        return true;
    });

    if (activeMessages.length === 0) {
        elements.notificationBanner.classList.add('hidden');
        return;
    }

    elements.notificationBanner.classList.remove('hidden');

    let currentIndex = 0;
    const showMessage = (index) => {
        const msg = activeMessages[index];
        const el = elements.bannerMessage;

        // Apply fade-in effect
        el.classList.remove('fade-in');
        void el.offsetWidth; // Force reflow
        el.classList.add('fade-in');
        el.textContent = msg.message_text;
    };

    // Initial show
    showMessage(0);

    // If multiple, start cycling
    if (activeMessages.length > 1) {
        appState.bannerInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % activeMessages.length;
            showMessage(currentIndex);
        }, 3000); // 3 seconds as requested
    }
}

function renderHero() {
    const slider = document.getElementById('hero-slider');
    const slides = CONFIG.SLIDER_IMAGES || [
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=80'
    ];

    slider.innerHTML = slides.map(src => `<div class="slide"><img src="${src}" alt="Deal"></div>`).join('');
    setupSlider();
}

function renderCategories() {
    let html = `<div class="category-tab active" data-id="deals">DEALS</div>`;
    appState.categories.forEach(cat => {
        html += `<div class="category-tab" data-id="cat-${cat.id}">${cat.name}</div>`;
    });
    elements.categoryTabs.innerHTML = html;

    // Tab click events - Smooth Scroll
    elements.categoryTabs.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.id;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                const bannerHeight = elements.notificationBanner.classList.contains('hidden') ? 0 : elements.notificationBanner.offsetHeight;
                const headerHeight = document.querySelector('.header').offsetHeight;
                const navHeight = elements.categoryTabs.parentElement.parentElement.offsetHeight;
                const offset = targetSection.offsetTop - bannerHeight - headerHeight - navHeight + 5;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            }
        });
    });

    // Initial arrow check
    setTimeout(updateScrollArrows, 100);
}

function updateScrollArrows() {
    const wrapper = elements.categoryTabs;
    const leftArrow = elements.scrollLeft;
    const rightArrow = elements.scrollRight;

    if (!wrapper || !leftArrow || !rightArrow) return;

    // Show/hide left arrow
    if (wrapper.scrollLeft > 10) {
        leftArrow.classList.remove('hidden');
    } else {
        leftArrow.classList.add('hidden');
    }

    // Show/hide right arrow
    const hasMoreRight = wrapper.scrollWidth > (wrapper.scrollLeft + wrapper.clientWidth + 10);
    if (hasMoreRight) {
        rightArrow.classList.remove('hidden');
    } else {
        rightArrow.classList.add('hidden');
    }
}

function renderMenu(searchTerm = '') {
    elements.menuSections.innerHTML = '';

    // 1. Render deals section
    renderDealSection(searchTerm);

    // 2. Render all category sections
    appState.categories.forEach(cat => {
        renderCategorySection(cat, searchTerm);
    });

    setupScrollObserver();
}

function renderDealSection(searchTerm) {
    const filteredDeals = appState.deals.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filteredDeals.length === 0 && searchTerm) return;

    let html = `
        <section class="category-section" id="deals">
            <h2 class="section-title">Exclusive Deals</h2>
            <div class="items-grid">
    `;

    filteredDeals.forEach(deal => {
        html += `
            <div class="item-card" data-deal-id="${deal.id}">
                <div class="item-image-wrapper">
                    <img src="${deal.image || 'https://via.placeholder.com/300x200'}" alt="${deal.name}" class="item-image">
                </div>
                <div class="item-info">
                    <h3 class="item-name">${deal.name}</h3>
                    <p class="item-desc">${deal.description || ''}</p>
                    <div class="item-price-badge">${CONFIG.CURRENCY_SYMBOL} ${deal.price}</div>
                    <div class="item-actions">
                        <button class="select-deal-btn">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div></section>`;
    elements.menuSections.insertAdjacentHTML('beforeend', html);

    // Attach events
    elements.menuSections.querySelectorAll('[data-deal-id]').forEach(card => {
        card.addEventListener('click', () => openDealModal(card.dataset.dealId));
    });
}

function renderCategorySection(category, searchTerm) {
    const filteredItems = appState.menuItems.filter(item =>
        item.category_id === category.id &&
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredItems.length === 0 && searchTerm) return;

    let html = `
        <section class="category-section" id="cat-${category.id}">
            <div class="category-banner">
                <img src="${category.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80'}" alt="${category.name}">
            </div>
            <div class="items-grid">
    `;

    filteredItems.forEach(item => {
        const isVariable = item.item_type === 'variable';
        html += `
            <div class="item-card" data-item-id="${item.id}">
                <div class="item-image-wrapper">
                    <img src="${item.image || 'https://via.placeholder.com/300x200'}" alt="${item.name}" class="item-image">
                </div>
                <div class="item-info">
                    <h3 class="item-name">${item.name}</h3>
                    <p class="item-desc">${item.description || ''}</p>
                    <div class="item-price-badge">${CONFIG.CURRENCY_SYMBOL} ${item.price}</div>
                    <div class="item-actions">
                        <button class="add-item-btn">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div></section>`;
    elements.menuSections.insertAdjacentHTML('beforeend', html);

    // Attach events
    elements.menuSections.querySelectorAll('[data-item-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent event bubbling if clicking child buttons specifically (not needed here but good practice)
            openItemModal(card.dataset.itemId);
        });
    });
}

function setupScrollObserver() {
    const sections = document.querySelectorAll('.category-section');
    const tabs = document.querySelectorAll('.category-tab');

    const options = {
        rootMargin: '-150px 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                tabs.forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.id === entry.target.id);
                    if (tab.classList.contains('active')) {
                        // Scroll the tab into view in the horizontal nav
                        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                });
            }
        });
    }, options);

    sections.forEach(section => observer.observe(section));
}

// MODAL LOGIC
function getGroupTotal(groupId, type = 'item') {
    const selections = (type === 'item' ? appState.selectedItem : appState.selectedDeal).selections;
    if (!selections[groupId]) return 0;
    return Object.values(selections[groupId]).reduce((a, b) => a + b, 0);
}

function updateGroupStatus(groupId, type = 'item') {
    const modal = elements.modalBody;
    const groupElement = modal.querySelector(`.group-section[data-group-id="${groupId}"]`);
    if (!groupElement) return;

    const state = (type === 'item' ? appState.selectedItem : appState.selectedDeal);
    const group = (type === 'item' ? state.menu_item_groups : state.deal_groups).find(g => g.id === groupId);
    const total = getGroupTotal(groupId, type);
    const isRequired = type === 'deal' ? (group.min_quantity > 0) : (group.is_required && group.min_quantity > 0);
    const minQty = isRequired ? group.min_quantity : 0;

    const statusBadge = groupElement.querySelector('.group-status');
    if (statusBadge) {
        if (total >= minQty && minQty > 0) {
            statusBadge.textContent = 'SELECTED';
            statusBadge.className = 'group-status selected';
            groupElement.classList.add('satisfied');
        } else if (minQty > 0) {
            statusBadge.textContent = `REQUIRED: ${minQty}`;
            statusBadge.className = 'group-status required';
            groupElement.classList.remove('satisfied');
        } else {
            statusBadge.textContent = total > 0 ? 'SELECTED' : '';
            statusBadge.className = `group-status ${total > 0 ? 'selected' : ''}`;
            if (total > 0) groupElement.classList.add('satisfied');
            else groupElement.classList.remove('satisfied');
        }
    }

    // Update individual plus buttons based on group max
    const maxQty = group.max_quantity;
    groupElement.querySelectorAll('.opt-qty-btn.plus').forEach(btn => {
        btn.disabled = maxQty && total >= maxQty;
    });
}

function openItemModal(itemId) {
    const item = appState.menuItems.find(i => i.id === itemId);
    if (!item) return;

    appState.selectedItem = JSON.parse(JSON.stringify(item));
    appState.selectedItem.selections = {};
    appState.selectedItem.quantity = 1;

    // Initialize default selections
    if (item.menu_item_groups) {
        item.menu_item_groups.forEach(group => {
            appState.selectedItem.selections[group.id] = {};
            group.menu_item_group_options.forEach(opt => {
                if (opt.is_default) {
                    appState.selectedItem.selections[group.id][opt.id] = 1;
                }
            });
        });
    }

    let groupsHtml = '';
    if (item.menu_item_groups) {
        item.menu_item_groups.sort((a, b) => a.display_order - b.display_order).forEach(group => {
            const isActuallyMandatory = group.is_required && group.min_quantity > 0;

            groupsHtml += `
                <div class="group-section ${isActuallyMandatory ? 'mandatory' : ''}" data-group-id="${group.id}">
                    <div class="group-header">
                        <div class="group-header-left">
                            <i class="fa-solid fa-chevron-down expand-btn"></i>
                            <span class="group-title">${group.title}</span>
                        </div>
                        <span class="group-status"></span>
                    </div>
                    <div class="options-list">
                        ${group.menu_item_group_options.sort((a, b) => a.display_order - b.display_order).map(opt => {
                const currentQty = appState.selectedItem.selections[group.id][opt.id] || 0;
                return `
                                <div class="option-row" data-option-id="${opt.id}">
                                    <div class="option-left">
                                        ${group.max_quantity === 1 ? `
                                            <input type="radio" name="group_${group.id}" id="opt_${opt.id}" ${currentQty > 0 ? 'checked' : ''}>
                                            <label for="opt_${opt.id}">
                                                ${opt.name} 
                                                <span class="inline-option-price">
                                                    (${opt.price && parseFloat(opt.price) > 0 ? CONFIG.CURRENCY_SYMBOL + ' ' + opt.price : '+' + opt.price_addition})
                                                </span>
                                            </label>
                                        ` : `
                                            <label>
                                                ${opt.name} 
                                                <span class="inline-option-price">
                                                    (${opt.price && parseFloat(opt.price) > 0 ? CONFIG.CURRENCY_SYMBOL + ' ' + opt.price : '+' + opt.price_addition})
                                                </span>
                                            </label>
                                        `}
                                    </div>
                                    <div class="option-right">
                                        ${group.max_quantity !== 1 ? `
                                            <div class="option-qty-controls">
                                                <button class="opt-qty-btn minus" data-group-id="${group.id}" data-option-id="${opt.id}">-</button>
                                                <span class="opt-qty-val" id="qty-val-${opt.id}">${currentQty}</span>
                                                <button class="opt-qty-btn plus" data-group-id="${group.id}" data-option-id="${opt.id}">+</button>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        });
    }

    elements.modalBody.innerHTML = `
        <div class="item-customizer">
            <div class="customizer-image-container">
                <img src="${item.image || 'https://via.placeholder.com/600x400'}" class="customizer-image" alt="${item.name}">
            </div>
            <div class="customizer-details">
                <h2 class="item-name">${item.name}</h2>
                <p class="item-price">${CONFIG.CURRENCY_SYMBOL} <span id="modal-display-price">${item.price}</span></p>
                <p class="item-desc">${item.description || ''}</p>
                <div class="groups-container">
                    ${groupsHtml}
                </div>
                <div class="modal-footer">
                    <div class="qty-controls">
                        <button class="qty-btn" id="modal-qty-minus"><i class="fa-solid fa-minus"></i></button>
                        <span id="modal-qty-val">1</span>
                        <button class="qty-btn" id="modal-qty-plus"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <button class="modal-add-to-cart-btn" id="modal-add-to-cart">
                        <span>${CONFIG.CURRENCY_SYMBOL} <span id="modal-total-price">${item.price}</span></span>
                        <span>Add To Cart</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (item.menu_item_groups) {
        item.menu_item_groups.forEach(g => updateGroupStatus(g.id, 'item'));
    }
    updateModalPrice();
    elements.itemModal.classList.add('open');
    elements.modalOverlay.classList.add('open');
}

function openDealModal(dealId) {
    const deal = appState.deals.find(d => d.id === dealId);
    if (!deal) return;

    appState.selectedDeal = JSON.parse(JSON.stringify(deal));
    appState.selectedDeal.selections = {};
    appState.selectedDeal.quantity = 1;

    deal.deal_groups.forEach(group => {
        appState.selectedDeal.selections[group.id] = {};
    });

    let groupsHtml = '';
    deal.deal_groups.sort((a, b) => a.display_order - b.display_order).forEach(group => {
        const isMandatory = group.min_quantity > 0;
        groupsHtml += `
            <div class="group-section ${isMandatory ? 'mandatory' : ''}" data-group-id="${group.id}">
                <div class="group-header">
                    <div class="group-header-left">
                        <i class="fa-solid fa-chevron-down expand-btn"></i>
                        <span class="group-title">${group.title}</span>
                    </div>
                    <span class="group-status"></span>
                </div>
                <div class="options-list">
                    ${group.deal_group_items.map(di => {
            const currentQty = appState.selectedDeal.selections[group.id][di.menu_item_id] || 0;
            return `
                            <div class="option-row" data-item-id="${di.menu_item_id}">
                                <div class="option-left">
                                    ${group.max_quantity === 1 ? `
                                        <input type="radio" name="dgroup_${group.id}" id="dopt_${di.id}" ${currentQty > 0 ? 'checked' : ''}>
                                        <label for="dopt_${di.id}">${di.menu_items.name}</label>
                                    ` : `
                                        <label>${di.menu_items.name}</label>
                                    `}
                                </div>
                                <div class="option-right">
                                    ${group.max_quantity !== 1 ? `
                                        <div class="option-qty-controls">
                                            <button class="opt-qty-btn minus" data-group-id="${group.id}" data-item-id="${di.menu_item_id}">-</button>
                                            <span class="opt-qty-val" id="dqty-val-${di.menu_item_id}">${currentQty}</span>
                                            <button class="opt-qty-btn plus" data-group-id="${group.id}" data-item-id="${di.menu_item_id}">+</button>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    });

    elements.modalBody.innerHTML = `
        <div class="item-customizer">
            <div class="customizer-image-container">
                <img src="${deal.image || 'https://via.placeholder.com/600x400'}" class="customizer-image" alt="${deal.name}">
            </div>
            <div class="customizer-details">
                <h2 class="item-name">${deal.name}</h2>
                <p class="item-price">${CONFIG.CURRENCY_SYMBOL} ${deal.price}</p>
                <p class="item-desc">${deal.description || ''}</p>
                <div class="groups-container">
                    ${groupsHtml}
                </div>
                <div class="modal-footer">
                    <div class="qty-controls">
                        <button class="qty-btn" id="modal-qty-minus"><i class="fa-solid fa-minus"></i></button>
                        <span id="modal-qty-val">1</span>
                        <button class="qty-btn" id="modal-qty-plus"><i class="fa-solid fa-plus"></i></button>
                    </div>
                    <button class="modal-add-to-cart-btn" id="deal-add-to-cart">
                        <span>${CONFIG.CURRENCY_SYMBOL} ${deal.price}</span>
                        <span>Add To Cart</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (deal.deal_groups) {
        deal.deal_groups.forEach(g => updateGroupStatus(g.id, 'deal'));
    }
    elements.itemModal.classList.add('open');
    elements.modalOverlay.classList.add('open');
}

function initModalEvents() {
    const modal = elements.modalBody;

    modal.addEventListener('click', (e) => {
        // Main Qty
        const minusBtn = e.target.closest('#modal-qty-minus');
        const plusBtn = e.target.closest('#modal-qty-plus');
        if (minusBtn || plusBtn) {
            const state = appState.selectedItem || appState.selectedDeal;
            if (!state) return;
            if (minusBtn && state.quantity > 1) state.quantity--;
            if (plusBtn) state.quantity++;
            modal.querySelector('#modal-qty-val').textContent = state.quantity;
            if (appState.selectedItem) updateModalPrice();
            return;
        }

        // Accordion
        const header = e.target.closest('.group-header');
        if (header) {
            header.closest('.group-section').classList.toggle('collapsed');
            return;
        }

        // Option Qty
        const optBtn = e.target.closest('.opt-qty-btn');
        if (optBtn) {
            const type = appState.selectedItem ? 'item' : 'deal';
            const state = appState.selectedItem || appState.selectedDeal;
            const { groupId, optionId, itemId } = optBtn.dataset;
            const targetId = optionId || itemId;

            const group = (type === 'item' ? state.menu_item_groups : state.deal_groups).find(g => g.id === groupId);
            const currentSelections = state.selections[groupId] || {};
            const currentQty = currentSelections[targetId] || 0;
            const totalInGroup = getGroupTotal(groupId, type);

            if (optBtn.classList.contains('plus')) {
                if (!group.max_quantity || totalInGroup < group.max_quantity) {
                    currentSelections[targetId] = currentQty + 1;
                }
            } else if (optBtn.classList.contains('minus')) {
                if (currentQty > 0) {
                    currentSelections[targetId] = currentQty - 1;
                }
            }

            state.selections[groupId] = currentSelections;
            const valElem = modal.querySelector(type === 'item' ? `#qty-val-${targetId}` : `#dqty-val-${targetId}`);
            if (valElem) valElem.textContent = currentSelections[targetId];

            updateGroupStatus(groupId, type);
            if (type === 'item') updateModalPrice();
            return;
        }

        // Add to Cart
        const itemBtn = e.target.closest('#modal-add-to-cart');
        const dealBtn = e.target.closest('#deal-add-to-cart');
        if (itemBtn) handleItemAddToCart();
        if (dealBtn) handleDealAddToCart();
    });

    modal.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            if (appState.selectedItem) {
                const groupId = e.target.name.replace('group_', '');
                const optionId = e.target.id.replace('opt_', '');
                appState.selectedItem.selections[groupId] = { [optionId]: 1 };
                updateGroupStatus(groupId, 'item');
                updateModalPrice();
            } else if (appState.selectedDeal) {
                const groupId = e.target.name.replace('dgroup_', '');
                const diId = e.target.id.replace('dopt_', '');
                const group = appState.selectedDeal.deal_groups.find(g => g.id === groupId);
                const di = group.deal_group_items.find(i => i.id === diId);
                appState.selectedDeal.selections[groupId] = { [di.menu_item_id]: 1 };
                updateGroupStatus(groupId, 'deal');
            }
        }
    });
}

function handleItemAddToCart() {
    const modal = elements.modalBody;
    const selections = [];
    let isValid = true;

    if (appState.selectedItem.menu_item_groups) {
        appState.selectedItem.menu_item_groups.forEach(group => {
            const total = getGroupTotal(group.id, 'item');
            const minQty = group.is_required ? (group.min_quantity || 0) : 0;

            if (total < minQty) {
                isValid = false;
                alert(`Please select at least ${minQty} for ${group.title}`);
            }

            const groupSelections = appState.selectedItem.selections[group.id];
            if (groupSelections) {
                Object.entries(groupSelections).forEach(([optId, qty]) => {
                    if (qty > 0) {
                        const opt = group.menu_item_group_options.find(o => o.id === optId);
                        selections.push({
                            group_title: group.title,
                            option_name: opt.name,
                            price: opt.price_addition,
                            quantity: qty
                        });
                    }
                });
            }
        });
    }

    if (!isValid) return;

    const selectionStrings = selections.map(s => `${s.quantity} X ${s.option_name}`);
    const detailedName = selections.length > 0
        ? `${appState.selectedItem.name} (${selectionStrings.join(', ')})`
        : appState.selectedItem.name;

    const cartItem = {
        id: appState.selectedItem.id,
        name: appState.selectedItem.name,
        detailedName: detailedName,
        price: parseFloat(modal.querySelector('#modal-total-price').textContent) / appState.selectedItem.quantity,
        quantity: appState.selectedItem.quantity,
        image: appState.selectedItem.image,
        selections: selections,
        type: 'item'
    };

    cartMgr.addToCart(cartItem);
    closeModal();
}

function handleDealAddToCart() {
    const modal = elements.modalBody;
    const selections = [];
    let isValid = true;

    appState.selectedDeal.deal_groups.forEach(group => {
        const total = getGroupTotal(group.id, 'deal');
        if (total < group.min_quantity) {
            isValid = false;
            alert(`Please select at least ${group.min_quantity} for ${group.title}`);
        }

        const groupSelections = appState.selectedDeal.selections[group.id];
        if (groupSelections) {
            Object.entries(groupSelections).forEach(([itemId, qty]) => {
                if (qty > 0) {
                    const di = group.deal_group_items.find(i => i.menu_item_id === itemId);
                    selections.push({
                        group_title: group.title,
                        item_name: di.menu_items.name,
                        quantity: qty
                    });
                }
            });
        }
    });

    if (!isValid) return;

    const selectionStrings = selections.map(s => `${s.quantity} X ${s.item_name}`);
    const detailedName = selections.length > 0
        ? `${appState.selectedDeal.name} (${selectionStrings.join(', ')})`
        : appState.selectedDeal.name;

    const cartItem = {
        id: appState.selectedDeal.id,
        name: appState.selectedDeal.name,
        detailedName: detailedName,
        price: appState.selectedDeal.price,
        quantity: appState.selectedDeal.quantity,
        image: appState.selectedDeal.image,
        selections: selections,
        type: 'deal'
    };

    cartMgr.addToCart(cartItem);
    closeModal();
}

function setupModalEvents() {
    const modal = elements.modalBody;
    const qtyVal = modal.querySelector('#modal-qty-val');

    modal.querySelector('#modal-qty-minus').onclick = () => {
        if (appState.selectedItem.quantity > 1) {
            appState.selectedItem.quantity--;
            qtyVal.textContent = appState.selectedItem.quantity;
            updateModalPrice();
        }
    };

    modal.querySelector('#modal-qty-plus').onclick = () => {
        appState.selectedItem.quantity++;
        qtyVal.textContent = appState.selectedItem.quantity;
        updateModalPrice();
    };

    // Handle Radio changes
    modal.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.onchange = (e) => {
            const groupId = e.target.name.replace('group_', '');
            const optionId = e.target.id.replace('opt_', '');
            appState.selectedItem.selections[groupId] = { [optionId]: 1 };
            updateGroupStatus(groupId, 'item');
            updateModalPrice();
        };
    });

    // Handle Plus/Minus click delegation (use onclick to prevent accumulation)
    modal.onclick = (e) => {
        const btn = e.target.closest('.opt-qty-btn');
        if (!btn) return;

        const { groupId, optionId } = btn.dataset;
        const group = appState.selectedItem.menu_item_groups.find(g => g.id === groupId);
        const currentSelections = appState.selectedItem.selections[groupId] || {};
        const currentOptQty = currentSelections[optionId] || 0;
        const totalInGroup = getGroupTotal(groupId, 'item');

        if (btn.classList.contains('plus')) {
            if (totalInGroup < group.max_quantity) {
                currentSelections[optionId] = currentOptQty + 1;
            }
        } else if (btn.classList.contains('minus')) {
            if (currentOptQty > 0) {
                currentSelections[optionId] = currentOptQty - 1;
            }
        }

        appState.selectedItem.selections[groupId] = currentSelections;
        modal.querySelector(`#qty-val-${optionId}`).textContent = currentSelections[optionId];

        updateGroupStatus(groupId, 'item');
        updateModalPrice();
    };

    modal.querySelector('#modal-add-to-cart').onclick = () => {
        const selections = [];
        let isValid = true;

        if (appState.selectedItem.menu_item_groups) {
            appState.selectedItem.menu_item_groups.forEach(group => {
                const total = getGroupTotal(group.id, 'item');
                const minQty = group.is_required ? (group.min_quantity || 0) : 0;

                if (total < minQty) {
                    isValid = false;
                    alert(`Please select at least ${minQty} for ${group.title}`);
                }

                // Collect Selections
                const groupSelections = appState.selectedItem.selections[group.id];
                if (groupSelections) {
                    Object.entries(groupSelections).forEach(([optId, qty]) => {
                        if (qty > 0) {
                            const opt = group.menu_item_group_options.find(o => o.id === optId);
                            selections.push({
                                group_title: group.title,
                                option_name: opt.name,
                                price: opt.price_addition,
                                quantity: qty
                            });
                        }
                    });
                }
            });
        }

        if (!isValid) return;

        const cartItem = {
            id: appState.selectedItem.id,
            name: appState.selectedItem.name,
            price: parseFloat(modal.querySelector('#modal-total-price').textContent) / appState.selectedItem.quantity,
            quantity: appState.selectedItem.quantity,
            image: appState.selectedItem.image,
            selections: selections,
            type: 'item'
        };

        cartMgr.addToCart(cartItem);
        closeModal();
    };
}

function setupDealModalEvents() {
    const modal = elements.modalBody;
    const qtyVal = modal.querySelector('#modal-qty-val');

    modal.querySelector('#modal-qty-minus').onclick = () => {
        if (appState.selectedDeal.quantity > 1) {
            appState.selectedDeal.quantity--;
            qtyVal.textContent = appState.selectedDeal.quantity;
        }
    };

    modal.querySelector('#modal-qty-plus').onclick = () => {
        appState.selectedDeal.quantity++;
        qtyVal.textContent = appState.selectedDeal.quantity;
    };

    // Radio
    modal.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.onchange = (e) => {
            const groupId = e.target.name.replace('dgroup_', '');
            const itemId = e.target.id.replace('dopt_', '');
            // Find the deal_group_item id from the radio id click... wait. 
            // My dopt id is di.id. Let's fix that.
            const diId = e.target.id.replace('dopt_', '');
            const group = appState.selectedDeal.deal_groups.find(g => g.id === groupId);
            const di = group.deal_group_items.find(i => i.id === diId);

            appState.selectedDeal.selections[groupId] = { [di.menu_item_id]: 1 };
            updateGroupStatus(groupId, 'deal');
        };
    });

    // Delegation for Plus/Minus in deals (use onclick to prevent accumulation)
    modal.onclick = (e) => {
        const btn = e.target.closest('.opt-qty-btn');
        if (!btn || !appState.selectedDeal) return;

        const { groupId, itemId } = btn.dataset;
        if (!itemId) return;

        const group = appState.selectedDeal.deal_groups.find(g => g.id === groupId);
        const currentSelections = appState.selectedDeal.selections[groupId] || {};
        const currentQty = currentSelections[itemId] || 0;
        const totalInGroup = getGroupTotal(groupId, 'deal');

        if (btn.classList.contains('plus')) {
            if (totalInGroup < group.max_quantity) {
                currentSelections[itemId] = currentQty + 1;
            }
        } else if (btn.classList.contains('minus')) {
            if (currentQty > 0) {
                currentSelections[itemId] = currentQty - 1;
            }
        }

        appState.selectedDeal.selections[groupId] = currentSelections;
        const valElem = modal.querySelector(`#dqty-val-${itemId}`);
        if (valElem) valElem.textContent = currentSelections[itemId];

        updateGroupStatus(groupId, 'deal');
    };

    modal.querySelector('#deal-add-to-cart').onclick = () => {
        const selections = [];
        let isValid = true;

        appState.selectedDeal.deal_groups.forEach(group => {
            const total = getGroupTotal(group.id, 'deal');
            if (total < group.min_quantity) {
                isValid = false;
                alert(`Please select at least ${group.min_quantity} for ${group.title}`);
            }

            const groupSelections = appState.selectedDeal.selections[group.id];
            if (groupSelections) {
                Object.entries(groupSelections).forEach(([itemId, qty]) => {
                    if (qty > 0) {
                        const di = group.deal_group_items.find(i => i.menu_item_id === itemId);
                        selections.push({
                            group_title: group.title,
                            item_name: di.menu_items.name,
                            quantity: qty
                        });
                    }
                });
            }
        });

        if (!isValid) return;

        const cartItem = {
            id: appState.selectedDeal.id,
            name: appState.selectedDeal.name,
            price: appState.selectedDeal.price,
            quantity: appState.selectedDeal.quantity,
            image: appState.selectedDeal.image,
            selections: selections,
            type: 'deal'
        };

        cartMgr.addToCart(cartItem);
        closeModal();
    };
}

function updateModalPrice() {
    if (!appState.selectedItem) return;
    const modal = elements.modalBody;
    let basePrice = parseFloat(appState.selectedItem.price);
    let extraPrice = 0;

    if (appState.selectedItem.menu_item_groups) {
        appState.selectedItem.menu_item_groups.forEach(group => {
            const groupSelections = appState.selectedItem.selections[group.id];
            if (groupSelections) {
                Object.entries(groupSelections).forEach(([optId, qty]) => {
                    if (qty > 0) {
                        const opt = group.menu_item_group_options.find(o => o.id === optId);
                        if (opt.price && parseFloat(opt.price) > 0) {
                            basePrice = parseFloat(opt.price);
                        } else {
                            extraPrice += parseFloat(opt.price_addition || 0) * qty;
                        }
                    }
                });
            }
        });
    }

    const unitPrice = basePrice + extraPrice;
    const grandTotal = (unitPrice * appState.selectedItem.quantity).toFixed(2);

    const displayPriceElem = modal.querySelector('#modal-display-price');
    if (displayPriceElem) displayPriceElem.textContent = unitPrice.toFixed(2);

    const priceElem = modal.querySelector('#modal-total-price');
    if (priceElem) priceElem.textContent = grandTotal;
}

function closeModal() {
    elements.itemModal.classList.remove('open');
    elements.modalOverlay.classList.remove('open');
    appState.selectedItem = null;
    appState.selectedDeal = null;
    elements.modalBody.onclick = null; // Clear delegation
}

// CART UI
function updateCartUI() {
    const cart = cartMgr.getCart();
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    elements.cartBadge.textContent = count;

    // Sidebar items
    let itemsHtml = '';
    cart.forEach(item => {
        const optionsHtml = item.selections.length > 0
            ? item.selections.map(s => `${s.quantity} X ${s.option_name || s.item_name}`).join(', ')
            : '';
        itemsHtml += `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/100'}" class="cart-item-img">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-options">${optionsHtml}</div>
                    <div class="cart-item-controls">
                        <div class="qty-controls">
                            <button class="qty-btn" onclick="app.updateQty('${item.instanceId}', -1)"><i class="fa-solid fa-minus"></i></button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" onclick="app.updateQty('${item.instanceId}', 1)"><i class="fa-solid fa-plus"></i></button>
                        </div>
                        <span class="item-price">${CONFIG.CURRENCY_SYMBOL} ${(item.price * item.quantity).toFixed(2)}</span>
                        <button class="remove-item-btn" onclick="app.removeItem('${item.instanceId}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    elements.cartItems.innerHTML = itemsHtml || '<p class="text-center">Your cart is empty</p>';

    const totals = cartMgr.calculateTotals(appState.settings, appState.coupon);

    let summaryHtml = `
        <div class="total-row"><span>Subtotal</span><span>${CONFIG.CURRENCY_SYMBOL} ${totals.subtotal.toFixed(2)}</span></div>
    `;

    if (totals.discountAmount > 0) {
        summaryHtml += `<div class="total-row text-success"><span>Discount</span><span>- ${CONFIG.CURRENCY_SYMBOL} ${totals.discountAmount.toFixed(2)}</span></div>`;
    }

    summaryHtml += `
        <div class="total-row"><span>Delivery Charges</span><span>${CONFIG.CURRENCY_SYMBOL} ${totals.deliveryFee.toFixed(2)}</span></div>
        <div class="total-row"><span>Tax (${appState.settings.tax_percentage}%)</span><span>${CONFIG.CURRENCY_SYMBOL} ${totals.taxAmount.toFixed(2)}</span></div>
        <div class="total-row grand-total"><span>Grand total</span><span>${CONFIG.CURRENCY_SYMBOL} ${totals.total.toFixed(2)}</span></div>
    `;
    elements.cartSummary.innerHTML = summaryHtml;
    elements.checkoutTotals.innerHTML = summaryHtml;
    elements.checkoutCartItems.innerHTML = itemsHtml;
}

// NAVIGATION
function toggleView(view) {
    if (view === 'checkout') {
        elements.homeView.classList.add('hidden');
        elements.checkoutView.classList.remove('hidden');
        window.scrollTo(0, 0);
    } else {
        elements.homeView.classList.remove('hidden');
        elements.checkoutView.classList.add('hidden');
    }
}

// EVENT LISTENERS
function setupEventListeners() {
    elements.cartToggle.onclick = () => {
        elements.cartSidebar.classList.add('open');
        elements.sidebarOverlay.classList.add('open');
    };

    elements.closeSidebar.onclick = elements.sidebarOverlay.onclick = () => {
        elements.cartSidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('open');
    };

    // Banner - no close logic as per request

    elements.menuSearch.oninput = (e) => renderMenu(e.target.value);

    // Category scroll arrows
    elements.scrollLeft.onclick = () => {
        elements.categoryTabs.scrollBy({ left: -200, behavior: 'smooth' });
    };

    elements.scrollRight.onclick = () => {
        elements.categoryTabs.scrollBy({ left: 200, behavior: 'smooth' });
    };

    elements.categoryTabs.onscroll = updateScrollArrows;
    window.onresize = updateScrollArrows;

    elements.checkoutBtn.onclick = () => {
        if (cartMgr.getCart().length === 0) return alert("Your cart is empty!");
        elements.cartSidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('open');
        toggleView('checkout');
    };

    elements.backToMenu.onclick = (e) => {
        e.preventDefault();
        toggleView('home');
    };

    elements.checkoutForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(elements.checkoutForm);
        const data = Object.fromEntries(formData.entries());

        try {
            // 1. Customer Check/Create
            let customerId = null;
            const existingCustomer = await api.fetchCustomerByPhone(data.mobile_number);

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const newCustomer = await api.createCustomer({
                    full_name: data.full_name,
                    email: data.email || null,
                    mobile_number: data.mobile_number,
                    address: data.address
                });
                customerId = newCustomer.id;
            }

            // 2. Calculate Totals (Passing Coupon!)
            const totals = cartMgr.calculateTotals(appState.settings, appState.coupon);

            const orderPayload = {
                restaurant_id: CONFIG.RESTAURANT_ID,
                order_number: 'ORD-' + Date.now().toString(36).toUpperCase(),
                customer_id: customerId,
                customer_name: data.full_name,
                customer_phone: data.mobile_number,
                customer_email: data.email,
                delivery_address: data.address,
                order_instructions: data.order_instructions,
                subtotal: totals.subtotal,
                delivery_fee: totals.deliveryFee,
                tax_amount: totals.taxAmount,
                total_amount: totals.total,
                coupon_id: appState.coupon ? appState.coupon.id : null,
                applied_coupon_code: appState.coupon ? appState.coupon.code : null,
                discount_amount: totals.discountAmount || 0,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'cash'
            };
            console.log("Submitting Order Payload:", orderPayload);

            const order = await api.createOrder(orderPayload);

            const orderItems = cartMgr.getCart().map(item => {
                const detailName = item.detailedName || item.name;
                const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
                return {
                    restaurant_id: CONFIG.RESTAURANT_ID,
                    order_id: order.id,
                    menu_item_id: (item.type === 'item' && isValidUUID) ? item.id : null,
                    item_name: detailName,
                    item_price: item.price,
                    quantity: item.quantity,
                    total_price: item.price * item.quantity
                };
            });

            await api.createOrderItems(orderItems);

            if (appState.coupon) {
                await api.incrementCouponUsage(appState.coupon.id);
            }

            alert("Order placed successfully!");
            cartMgr.clearCart();
            location.reload();
        } catch (err) {
            console.error(err);
            alert("Order Error: " + (err.message || JSON.stringify(err)));
        }
    };

    // Modal close
    document.querySelector('.modal-close').onclick = elements.modalOverlay.onclick = closeModal;

    // Listen for cart updates
    window.addEventListener('cartUpdated', updateCartUI);

    // Coupon logic
    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.onclick = handleApplyCoupon;
    }

    console.log("Configured Restaurant ID:", CONFIG.RESTAURANT_ID);
}

async function handleApplyCoupon() {
    const input = document.getElementById('coupon-code');
    const msg = document.getElementById('coupon-message');
    const code = input.value.trim().toUpperCase();

    if (!code) return;

    msg.textContent = 'Checking...';
    msg.className = 'coupon-message';

    console.log("Applying coupon:", code);
    const couponResult = await api.fetchCouponByCode(code);
    const totals = cartMgr.calculateTotals(appState.settings);

    if (!couponResult) {
        msg.textContent = 'Coupon not found or inactive';
        msg.className = 'coupon-message error';
        return;
    }

    // Validation
    const now = new Date();
    const expiry = couponResult.expiry_at || couponResult.expiry_date;
    if (expiry && new Date(expiry) < now) {
        msg.textContent = 'Coupon has expired';
        msg.className = 'coupon-message error';
        return;
    }

    const minAmount = couponResult.minimum_order_amount || couponResult.min_order_amount || 0;
    if (totals.subtotal < minAmount) {
        msg.textContent = `Minimum order amount for this coupon is ${CONFIG.CURRENCY_SYMBOL} ${minAmount}`;
        msg.className = 'coupon-message error';
        return;
    }

    const usageCount = couponResult.usage_count || couponResult.usage_limit_count || couponResult.used_count || 0;
    if (couponResult.usage_limit && usageCount >= couponResult.usage_limit) {
        msg.textContent = 'Coupon usage limit reached';
        msg.className = 'coupon-message error';
        return;
    }

    appState.coupon = couponResult;
    msg.textContent = 'Coupon applied successfully!';
    msg.className = 'coupon-message success';
    updateCartUI();
}

// SLIDER LOGIC
function setupSlider() {
    const slider = document.getElementById('hero-slider');
    const slides = slider.querySelectorAll('.slide');
    const nextBtn = document.querySelector('.slider-btn.next');
    const prevBtn = document.querySelector('.slider-btn.prev');
    let currentSlide = 0;

    const showSlide = (n) => {
        currentSlide = (n + slides.length) % slides.length;
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    };

    nextBtn.onclick = () => showSlide(currentSlide + 1);
    prevBtn.onclick = () => showSlide(currentSlide - 1);

    // Auto slide
    setInterval(() => showSlide(currentSlide + 1), 5000);
}

// Global helper for cart controls in HTML strings
window.app = {
    updateQty: (id, delta) => cartMgr.updateQuantity(id, delta),
    removeItem: (id) => cartMgr.removeFromCart(id),
    toggleView: toggleView,
    applyCoupon: handleApplyCoupon,
    debug: async () => {
        console.log("--- DIAGNOSTIC START ---");
        console.log("Config ID:", CONFIG.RESTAURANT_ID);
        const { data: res, error: err } = await api.fetchRestaurantData();
        console.log("Restaurant Data:", res || err);
        console.log("App State Settings:", appState.settings);
        console.log("Cart Totals:", cartMgr.calculateTotals(appState.settings, appState.coupon));
        console.log("--- DIAGNOSTIC END ---");
        alert("Diagnostic data printed to console. Please right-click -> Inspect -> Console to view.");
    }
};

// Start
init();
