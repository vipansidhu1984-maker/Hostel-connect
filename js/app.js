/**
 * HostelConnect - Core Application Logic
 * College Hostel Food Marketplace & In-App Chat
 */

// ============================================================================
// State & Storage Keys
// ============================================================================
const STORAGE_KEYS = {
  USER: 'hostel_connect_user',
  LISTINGS: 'hostel_connect_listings',
  CHATS: 'hostel_connect_chats',
  ORDERS: 'hostel_connect_orders'
};

// Initial Listings (Empty: all items are student-uploaded)
const INITIAL_LISTINGS = [];

// App Global State
let currentUser = null;
let listings = [];
let allChats = {};
let activeChatContext = null; // { listing, partner, chatId }
let currentFilter = {
  searchQuery: '',
  sortBy: 'recommended'
};
let currentView = 'marketplace'; // 'marketplace' | 'my-listings' | 'my-chats'

// Sound chime generator using Web Audio API
function playChime(type = 'msg') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'msg') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'order') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Audio context may require user gesture on some browsers
  }
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '🍃' : '⚡'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initUser();
  setupEventListeners();
  renderApp();
});

function initStorage() {
  // Load listings from LocalStorage
  const savedListings = localStorage.getItem(STORAGE_KEYS.LISTINGS);
  if (savedListings) {
    try {
      const parsed = JSON.parse(savedListings);
      // Filter out any legacy demo items (item_1 through item_6)
      listings = parsed.filter(item => !['item_1', 'item_2', 'item_3', 'item_4', 'item_5', 'item_6'].includes(item.id));
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    } catch (e) {
      listings = [];
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    }
  } else {
    listings = [];
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
  }

  // Load chats
  const savedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
  if (savedChats) {
    try {
      allChats = JSON.parse(savedChats);
    } catch (e) {
      allChats = {};
    }
  }
}

function initUser() {
  const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      updateHeaderUserBadge();
    } catch (e) {
      openLoginModal(true);
    }
  } else {
    // No user saved: Show login modal immediately as requested
    openLoginModal(true);
  }
}

function updateHeaderUserBadge() {
  const badgeName = document.getElementById('headerUserName');
  const badgeRoom = document.getElementById('headerUserRoom');
  const badgeAvatar = document.getElementById('headerUserAvatar');

  if (currentUser && badgeName && badgeRoom && badgeAvatar) {
    badgeName.textContent = currentUser.name;
    badgeRoom.textContent = `Room ${currentUser.room}`;
    badgeAvatar.textContent = currentUser.avatar || '👤';
  }
}

// ============================================================================
// Event Listeners
// ============================================================================
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('foodSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.searchQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = currentFilter.searchQuery ? 'block' : 'none';
      }
      renderFoodGrid();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentFilter.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFoodGrid();
      }
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilter.sortBy = e.target.value;
      renderFoodGrid();
    });
  }

  // Navigation tabs (Marketplace / My Listings / My Chats)
  const viewTabs = document.querySelectorAll('.view-tab-btn');
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.dataset.view;
      renderView();
    });
  });

  // Open List Food Modal
  const openUploadBtns = document.querySelectorAll('.btn-open-upload');
  openUploadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!currentUser) {
        openLoginModal(true);
        return;
      }
      openUploadModal();
    });
  });

  // Profile Badge click -> Switch profile
  const profileBadge = document.getElementById('userProfileBadge');
  if (profileBadge) {
    profileBadge.addEventListener('click', () => {
      openLoginModal(false);
    });
  }

  // Login Modal form submit
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
  }

  // Upload Food Form submit
  const uploadForm = document.getElementById('uploadFoodForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadSubmit);
  }

  // Camera photo box click triggers camera file input
  const cameraTrigger = document.getElementById('cameraUploadTrigger');
  const customFileInput = document.getElementById('foodImageFile');
  if (cameraTrigger && customFileInput) {
    cameraTrigger.addEventListener('click', (e) => {
      if (e.target.closest('#retakePhotoBtn')) return;
      customFileInput.click();
    });
  }

  // Retake photo button
  const retakeBtn = document.getElementById('retakePhotoBtn');
  if (retakeBtn && customFileInput) {
    retakeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      customFileInput.click();
    });
  }

  // Custom photo file input handler (camera capture)
  if (customFileInput) {
    customFileInput.addEventListener('change', handleCustomPhotoUpload);
  }

  // Chat send message
  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', handleSendMessage);
  }

  // Close modals on clicking overlay or close buttons
  document.querySelectorAll('.close-modal-btn, .modal-cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-backdrop');
      if (modal) modal.classList.remove('open');
    });
  });

  // Close chat drawer button
  const closeChatBtn = document.getElementById('closeChatDrawerBtn');
  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', closeChatDrawer);
  }

  // Direct In-Chat Place Order button
  const inChatOrderBtn = document.getElementById('inChatOrderBtn');
  if (inChatOrderBtn) {
    inChatOrderBtn.addEventListener('click', () => {
      placeOrderInChat();
    });
  }

  // Quick suggestion chips in chat
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('chatMsgInput');
      if (input) {
        input.value = chip.textContent.trim();
        input.focus();
      }
    });
  });
}

// ============================================================================
// Login & User Session Management
// ============================================================================
function openLoginModal(isMandatory = false) {
  const modal = document.getElementById('loginModal');
  const closeBtn = modal.querySelector('.close-modal-btn');
  const cancelBtn = modal.querySelector('.modal-cancel-btn');

  // If mandatory first-time login, hide cancel/close buttons so user sets up their profile
  if (isMandatory) {
    if (closeBtn) closeBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  } else {
    if (closeBtn) closeBtn.style.display = 'flex';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  }

  if (currentUser) {
    document.getElementById('loginNameInput').value = currentUser.name || '';
    document.getElementById('loginRoomInput').value = currentUser.room || '';
  }

  modal.classList.add('open');
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('loginNameInput').value.trim();
  const room = document.getElementById('loginRoomInput').value.trim();

  if (!name || !room) {
    showToast('Please enter both your name and room number!', 'amber');
    return;
  }

  const user = {
    id: currentUser ? currentUser.id : 'user_' + Date.now(),
    name,
    room,
    avatar: '👤'
  };

  applyUserLogin(user);
  closeModal('loginModal');
  showToast(`Welcome, ${name} (Room ${room})!`, 'success');
}

function applyUserLogin(user) {
  currentUser = user;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  updateHeaderUserBadge();
  renderApp();
}

// ============================================================================
// Render Views & Food Feed
// ============================================================================
function renderApp() {
  renderFoodGrid();
  updateChatsBadge();
}

function renderView() {
  const marketplaceSection = document.getElementById('marketplaceSection');
  const myListingsSection = document.getElementById('myListingsSection');
  const myChatsSection = document.getElementById('myChatsSection');

  if (currentView === 'marketplace') {
    if (marketplaceSection) marketplaceSection.style.display = 'block';
    if (myListingsSection) myListingsSection.style.display = 'none';
    if (myChatsSection) myChatsSection.style.display = 'none';
    renderFoodGrid();
  } else if (currentView === 'my-listings') {
    if (marketplaceSection) marketplaceSection.style.display = 'none';
    if (myListingsSection) myListingsSection.style.display = 'block';
    if (myChatsSection) myChatsSection.style.display = 'none';
    renderMyListings();
  } else if (currentView === 'my-chats') {
    if (marketplaceSection) marketplaceSection.style.display = 'none';
    if (myListingsSection) myListingsSection.style.display = 'none';
    if (myChatsSection) myChatsSection.style.display = 'block';
    renderMyChats();
  }
}

function renderFoodGrid() {
  const grid = document.getElementById('foodGrid');
  const emptyState = document.getElementById('emptyFoodState');
  if (!grid) return;

  // Filter listings
  let filtered = listings.filter(item => {
    // Search query
    if (currentFilter.searchQuery) {
      const q = currentFilter.searchQuery;
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchSeller = (item.seller && item.seller.name ? item.seller.name : '').toLowerCase().includes(q);
      const matchRoom = String(item.seller && item.seller.room ? item.seller.room : '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSeller && !matchRoom) {
        return false;
      }
    }
    return true;
  });

  // Sort listings
  if (currentFilter.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentFilter.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    // Recommended / Newest
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  grid.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  filtered.forEach(item => {
    const card = createFoodCardElement(item);
    grid.appendChild(card);
  });
}

function createFoodCardElement(item) {
  const card = document.createElement('article');
  card.className = 'food-card';
  card.id = `card_${item.id}`;

  const isMyItem = currentUser && item.seller.id === currentUser.id;

  // Delivery text
  let deliveryIcon = '🚶';
  let deliveryText = 'Pickup from room';
  if (item.deliveryType === 'delivery') {
    deliveryIcon = '🛵';
    deliveryText = 'Room door delivery';
  } else if (item.deliveryType === 'both') {
    deliveryIcon = '⚡';
    deliveryText = 'Pickup or Room drop';
  }

  card.innerHTML = `
    <div class="card-media-wrapper">
      <img src="${item.image}" alt="${escapeHtml(item.title)}" class="card-media-img" loading="lazy" onerror="this.src='assets/images/maggi.jpg'"/>

      <div class="portion-tag">
        📦 ${item.portions > 0 ? `${item.portions} portion${item.portions > 1 ? 's' : ''} left` : 'Last 1 left'}
      </div>

      <div class="price-badge">
        ₹${item.price}
      </div>
    </div>

    <div class="card-body">
      <div class="card-title-row">
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
      </div>
      <p class="card-desc">${escapeHtml(item.description)}</p>

      <div class="delivery-badge-indicator">
        <span>${deliveryIcon}</span>
        <span>${escapeHtml(item.deliveryNote || deliveryText)}</span>
      </div>

      <div class="seller-info-row">
        <div class="seller-profile-inline">
          <div class="seller-avatar-tiny">${item.seller.avatar || '👤'}</div>
          <span class="seller-name">${escapeHtml(item.seller.name)}</span>
        </div>
        <div class="seller-room-badge">
          📍 Room ${escapeHtml(item.seller.room)}
        </div>
      </div>

      <div class="card-actions-row">
        ${isMyItem 
          ? `<button class="btn btn-secondary btn-manage-item" data-id="${item.id}">
              ⚙️ Manage Stash
             </button>`
          : `<button class="btn btn-primary btn-chat-order" data-id="${item.id}">
              💬 Order & Chat
             </button>`
        }
      </div>
    </div>
  `;

  // Attach card action
  const chatBtn = card.querySelector('.btn-chat-order');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      openChatWithSeller(item);
    });
  }

  const manageBtn = card.querySelector('.btn-manage-item');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => {
      manageMyItem(item);
    });
  }

  return card;
}

// Render "My Listings" tab
function renderMyListings() {
  const container = document.getElementById('myListingsContainer');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <h3>Please Log In</h3>
        <p>Set your room number and name to manage your food stash.</p>
        <button class="btn btn-primary" onclick="openLoginModal(true)">Log In Now</button>
      </div>
    `;
    return;
  }

  const myListings = listings.filter(i => i.seller.id === currentUser.id);

  if (myListings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🍳</div>
        <h3>No Food Listed Yet</h3>
        <p>Got extra Maggi, home snacks, or drinks? Share and earn pocket money from your hostel mates!</p>
        <button class="btn btn-primary btn-open-upload">➕ List an Item Now</button>
      </div>
    `;
    container.querySelector('.btn-open-upload').addEventListener('click', openUploadModal);
    return;
  }

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h2 style="font-size:1.35rem; color:var(--green-primary);">My Food Stash (${myListings.length})</h2>
      <button class="btn btn-primary btn-open-upload">➕ List Another Item</button>
    </div>
    <div class="food-grid" id="myListingsGrid"></div>
  `;

  container.querySelector('.btn-open-upload').addEventListener('click', openUploadModal);

  const grid = container.querySelector('#myListingsGrid');
  myListings.forEach(item => {
    const card = createFoodCardElement(item);
    grid.appendChild(card);
  });
}

// Render "My Chats" tab
function renderMyChats() {
  const container = document.getElementById('myChatsContainer');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <h3>Please Log In</h3>
        <p>Log in to view your conversations with other hostel rooms.</p>
        <button class="btn btn-primary" onclick="openLoginModal(true)">Log In Now</button>
      </div>
    `;
    return;
  }

  const chatKeys = Object.keys(allChats);
  // Filter chats relevant to currentUser (either buyer or seller)
  const myChats = chatKeys
    .map(key => allChats[key])
    .filter(chat => {
      return chat.buyerId === currentUser.id || chat.sellerId === currentUser.id;
    })
    .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

  if (myChats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📫</div>
        <h3>No Conversations Yet</h3>
        <p>Click "Order & Chat" on any food item to message the room seller!</p>
        <button class="btn btn-primary" onclick="switchView('marketplace')">Explore Food Feed</button>
      </div>
    `;
    return;
  }

  let html = `
    <div style="max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.85rem;">
      <h2 style="font-size: 1.35rem; color: var(--green-primary); margin-bottom: 0.5rem;">Hostel Room Messages</h2>
  `;

  myChats.forEach(chat => {
    const isBuyer = chat.buyerId === currentUser.id;
    const otherPartyName = isBuyer ? chat.sellerName : chat.buyerName;
    const otherPartyRoom = isBuyer ? chat.sellerRoom : chat.buyerRoom;
    const otherPartyAvatar = isBuyer ? '🍲' : '🙋';
    const lastMsg = chat.messages[chat.messages.length - 1];
    const lastText = lastMsg ? (lastMsg.type === 'order' ? '🛒 Order Placed' : lastMsg.text) : 'Started chat';
    const timeStr = lastMsg ? formatTime(lastMsg.timestamp) : '';

    html += `
      <div class="chat-thread-card" data-chat-id="${chat.id}" style="
        background: var(--bg-cream-card);
        border: 1px solid var(--border-cream);
        border-radius: var(--radius-md);
        padding: 1rem 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        transition: var(--transition-fast);
        box-shadow: var(--shadow-sm);
      ">
        <div style="
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: var(--green-mint-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        ">${otherPartyAvatar}</div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
            <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(otherPartyName)}</h4>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${timeStr}</span>
          </div>
          <div style="font-size: 0.76rem; font-weight: 600; color: var(--green-sage); margin-bottom: 4px;">
            📍 Room ${escapeHtml(otherPartyRoom)} • ${escapeHtml(chat.itemTitle)}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(lastText)}
          </div>
        </div>

        <button class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; flex-shrink: 0;">
          Open
        </button>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Add click events to resume chats
  container.querySelectorAll('.chat-thread-card').forEach(card => {
    card.addEventListener('click', () => {
      const chatId = card.dataset.chatId;
      const chat = allChats[chatId];
      if (chat) {
        resumeChat(chat);
      }
    });
  });
}

function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
  renderView();
}

// ============================================================================
// Upload / List Food Item Management
// ============================================================================
function openUploadModal() {
  const modal = document.getElementById('uploadModal');
  if (!modal) return;

  // Populate seller info preview
  if (currentUser) {
    const sellerInfoPill = document.getElementById('uploadSellerPreview');
    if (sellerInfoPill) {
      sellerInfoPill.textContent = `Listing as: ${currentUser.name} (Room ${currentUser.room})`;
    }
  }

  // Reset form
  const form = document.getElementById('uploadFoodForm');
  if (form) form.reset();

  // Reset camera preview and hidden image value
  const hiddenImg = document.getElementById('selectedPresetImg');
  if (hiddenImg) hiddenImg.value = '';

  const fileInput = document.getElementById('foodImageFile');
  if (fileInput) fileInput.value = '';

  const promptContent = document.getElementById('cameraPromptContent');
  if (promptContent) promptContent.style.display = 'block';

  const previewWrapper = document.getElementById('cameraPreviewWrapper');
  if (previewWrapper) previewWrapper.style.display = 'none';

  const preview = document.getElementById('uploadPhotoPreview');
  if (preview) preview.src = '';

  modal.classList.add('open');
}

function handleCustomPhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const dataUrl = event.target.result;
    const hiddenImg = document.getElementById('selectedPresetImg');
    if (hiddenImg) hiddenImg.value = dataUrl;

    const promptContent = document.getElementById('cameraPromptContent');
    if (promptContent) promptContent.style.display = 'none';

    const previewWrapper = document.getElementById('cameraPreviewWrapper');
    if (previewWrapper) previewWrapper.style.display = 'block';

    const preview = document.getElementById('uploadPhotoPreview');
    if (preview) {
      preview.src = dataUrl;
    }
  };
  reader.readAsDataURL(file);
}

function handleUploadSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    openLoginModal(true);
    return;
  }

  const title = document.getElementById('foodTitleInput').value.trim();
  const price = parseInt(document.getElementById('foodPriceInput').value, 10);
  const portions = parseInt(document.getElementById('foodPortionsInput').value || '1', 10);
  const deliveryType = document.getElementById('foodDeliveryTypeSelect').value;
  const description = document.getElementById('foodDescInput').value.trim();
  const image = document.getElementById('selectedPresetImg').value;

  if (!title || isNaN(price) || price < 0) {
    showToast('Please provide a valid food title and price!', 'amber');
    return;
  }

  if (!image) {
    showToast('Please take or upload a camera photo of the food item!', 'amber');
    return;
  }

  const newItem = {
    id: 'item_' + Date.now(),
    title,
    price,
    portions,
    deliveryType,
    deliveryNote: deliveryType === 'delivery' 
      ? `Room delivery from Rm ${currentUser.room}` 
      : `Pickup from Rm ${currentUser.room}`,
    description: description || `Fresh ${title} available from Room ${currentUser.room}`,
    image,
    seller: {
      id: currentUser.id,
      name: currentUser.name,
      room: currentUser.room,
      avatar: currentUser.avatar || '👤'
    },
    createdAt: Date.now(),
    status: 'available'
  };

  // Save to state and LocalStorage
  listings.unshift(newItem);
  localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));

  closeModal('uploadModal');
  showToast(`🎉 "${title}" is now live on the hostel feed!`, 'success');
  playChime('order');

  renderFoodGrid();
}

function manageMyItem(item) {
  const confirmDelete = confirm(`Would you like to remove "${item.title}" from the listings, or mark it as finished?`);
  if (confirmDelete) {
    listings = listings.filter(i => i.id !== item.id);
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    showToast(`Removed "${item.title}" from your stash.`, 'amber');
    renderApp();
    if (currentView === 'my-listings') renderMyListings();
  }
}

// ============================================================================
// In-App Chat & Ordering System
// ============================================================================
function openChatWithSeller(item) {
  if (!currentUser) {
    openLoginModal(true);
    return;
  }

  // Build unique chatId for this buyer + seller + item
  const chatId = `chat_${item.id}_${currentUser.id}`;

  activeChatContext = {
    chatId,
    item,
    partner: item.seller,
    isBuyer: true
  };

  // Retrieve or create chat thread
  if (!allChats[chatId]) {
    allChats[chatId] = {
      id: chatId,
      itemId: item.id,
      itemTitle: item.title,
      itemPrice: item.price,
      itemImage: item.image,
      sellerId: item.seller.id,
      sellerName: item.seller.name,
      sellerRoom: item.seller.room,
      buyerId: currentUser.id,
      buyerName: currentUser.name,
      buyerRoom: currentUser.room,
      lastUpdated: Date.now(),
      messages: [
        {
          id: 'msg_welcome',
          senderId: item.seller.id,
          senderName: item.seller.name,
          text: `Hey! Thanks for checking out my ${item.title}. Let me know if you want it delivered or want to come pick it up from Rm ${item.seller.room}! 👋`,
          timestamp: Date.now() - 60000,
          type: 'text'
        }
      ]
    };
    saveChats();
  }

  renderChatDrawerContent();
  openChatDrawer();
}

function resumeChat(chat) {
  const item = listings.find(i => i.id === chat.itemId) || {
    id: chat.itemId,
    title: chat.itemTitle,
    price: chat.itemPrice,
    image: chat.itemImage || 'assets/images/maggi.jpg',
    seller: {
      id: chat.sellerId,
      name: chat.sellerName,
      room: chat.sellerRoom,
      avatar: '🍲'
    }
  };

  const isBuyer = currentUser.id === chat.buyerId;
  const partner = isBuyer 
    ? { id: chat.sellerId, name: chat.sellerName, room: chat.sellerRoom, avatar: '🍲' }
    : { id: chat.buyerId, name: chat.buyerName, room: chat.buyerRoom, avatar: '🙋' };

  activeChatContext = {
    chatId: chat.id,
    item,
    partner,
    isBuyer
  };

  renderChatDrawerContent();
  openChatDrawer();
}

function renderChatDrawerContent() {
  if (!activeChatContext) return;

  const { item, partner, chatId, isBuyer } = activeChatContext;
  const chat = allChats[chatId];

  // Header partner info
  document.getElementById('chatPartnerName').textContent = partner.name;
  document.getElementById('chatPartnerRoom').textContent = `Room ${partner.room} • Online now`;
  document.getElementById('chatPartnerAvatar').textContent = partner.avatar || (isBuyer ? '🍲' : '🙋');

  // Food item preview header
  document.getElementById('chatItemThumb').src = item.image;
  document.getElementById('chatItemTitle').textContent = item.title;
  document.getElementById('chatItemPrice').textContent = `₹${item.price}`;

  const inChatOrderBtn = document.getElementById('inChatOrderBtn');
  if (inChatOrderBtn) {
    inChatOrderBtn.style.display = isBuyer ? 'inline-flex' : 'none';
  }

  // Render messages
  const msgContainer = document.getElementById('chatMessagesContainer');
  msgContainer.innerHTML = `
    <div class="chat-timestamp-divider">
      Today • Connected with Room ${partner.room}
    </div>
  `;

  if (chat && chat.messages) {
    chat.messages.forEach(msg => {
      msgContainer.appendChild(createMessageElement(msg));
    });
  }

  // Scroll to bottom
  setTimeout(() => {
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }, 50);
}

function createMessageElement(msg) {
  const isOutgoing = currentUser && msg.senderId === currentUser.id;
  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${isOutgoing ? 'outgoing' : 'incoming'}`;

  if (msg.type === 'order') {
    wrap.innerHTML = `
      <div class="in-chat-order-card">
        <div class="order-card-header">
          <strong style="color:var(--green-primary); font-size:0.88rem;">📦 Food Order Request</strong>
          <span class="order-badge-status status-${msg.orderStatus || 'pending'}">
            ${(msg.orderStatus || 'Pending').toUpperCase()}
          </span>
        </div>
        <div class="order-card-body">
          <strong>1x ${escapeHtml(msg.itemTitle || 'Food Item')}</strong><br/>
          <span style="color:var(--text-secondary); font-size:0.8rem;">
            Total: ₹${msg.itemPrice || ''} • Destination: Room ${escapeHtml(msg.buyerRoom || '')}
          </span>
        </div>
        <div class="order-card-actions">
          ${currentUser && msg.sellerId === currentUser.id && msg.orderStatus === 'pending'
            ? `<button class="btn btn-primary" onclick="updateOrderStatus('${activeChatContext.chatId}', '${msg.id}', 'confirmed')">
                ✅ Accept & Prepare
               </button>`
            : ''
          }
          ${msg.orderStatus === 'confirmed' 
            ? `<button class="btn btn-secondary" onclick="updateOrderStatus('${activeChatContext.chatId}', '${msg.id}', 'delivered')">
                🎉 Mark as Delivered
               </button>`
            : ''
          }
        </div>
      </div>
      <span class="msg-time">${formatTime(msg.timestamp)}</span>
    `;
  } else {
    wrap.innerHTML = `
      <div class="msg-bubble">
        ${escapeHtml(msg.text)}
      </div>
      <span class="msg-time">${formatTime(msg.timestamp)}</span>
    `;
  }

  return wrap;
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatMsgInput');
  const text = input.value.trim();
  if (!text || !activeChatContext) return;

  const { chatId, partner } = activeChatContext;
  const chat = allChats[chatId];
  if (!chat) return;

  const newMsg = {
    id: 'msg_' + Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.name,
    text,
    timestamp: Date.now(),
    type: 'text'
  };

  chat.messages.push(newMsg);
  chat.lastUpdated = Date.now();
  saveChats();

  input.value = '';
  playChime('msg');

  // Append message to UI
  const msgContainer = document.getElementById('chatMessagesContainer');
  msgContainer.appendChild(createMessageElement(newMsg));
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Trigger realistic hostel simulated response if talking to an automated hostel student
  if (partner.id !== currentUser.id) {
    triggerSimulatedHostelReply(text, chatId, partner);
  }
}

function placeOrderInChat() {
  if (!activeChatContext) return;
  const { chatId, item } = activeChatContext;
  const chat = allChats[chatId];
  if (!chat) return;

  const orderMsg = {
    id: 'order_' + Date.now(),
    senderId: currentUser.id,
    senderName: currentUser.name,
    sellerId: item.seller.id,
    buyerRoom: currentUser.room,
    itemTitle: item.title,
    itemPrice: item.price,
    timestamp: Date.now(),
    type: 'order',
    orderStatus: 'pending'
  };

  chat.messages.push(orderMsg);
  chat.lastUpdated = Date.now();
  saveChats();

  playChime('order');
  showToast(`Order placed for ${item.title}!`, 'success');

  const msgContainer = document.getElementById('chatMessagesContainer');
  msgContainer.appendChild(createMessageElement(orderMsg));
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Simulate seller prompt response
  setTimeout(() => {
    const replies = [
      `Got your order bro! 🛵 Starting on it now, will bring it over to Room ${currentUser.room} in about 5-8 minutes. Keep ₹${item.price} or UPI ready!`,
      `Awesome! Just packed it hot for you. You can come grab it from Rm ${item.seller.room} or I can drop it off. Let me know! 🍜`,
      `Order confirmed! Making sure it's extra hot for you. See you soon at Rm ${currentUser.room}! 👍`
    ];
    const replyText = replies[Math.floor(Math.random() * replies.length)];

    const sellerReply = {
      id: 'msg_' + Date.now(),
      senderId: item.seller.id,
      senderName: item.seller.name,
      text: replyText,
      timestamp: Date.now(),
      type: 'text'
    };

    chat.messages.push(sellerReply);
    chat.lastUpdated = Date.now();
    saveChats();

    // If chat is still open, append and play chime
    if (activeChatContext && activeChatContext.chatId === chatId) {
      msgContainer.appendChild(createMessageElement(sellerReply));
      msgContainer.scrollTop = msgContainer.scrollHeight;
      playChime('msg');
    }
    updateOrderStatus(chatId, orderMsg.id, 'confirmed');
  }, 1200);
}

// Window global so onclick buttons inside order cards can call it
window.updateOrderStatus = function(chatId, msgId, newStatus) {
  const chat = allChats[chatId];
  if (!chat) return;

  const targetMsg = chat.messages.find(m => m.id === msgId);
  if (targetMsg) {
    targetMsg.orderStatus = newStatus;
    saveChats();
    playChime('order');
    if (activeChatContext && activeChatContext.chatId === chatId) {
      renderChatDrawerContent();
    }
    showToast(`Order status updated to: ${newStatus.toUpperCase()}`, 'success');
  }
};

function triggerSimulatedHostelReply(userText, chatId, partner) {
  const lower = userText.toLowerCase();

  let replyText = "Hey! Yes, available. Come to my room whenever you're ready, or tell me your room!";

  if (lower.includes('available') || lower.includes('still have')) {
    replyText = `Yes bro, still got it! Steaming hot and ready. You want me to deliver to Rm ${currentUser.room}?`;
  } else if (lower.includes('deliver') || lower.includes('room')) {
    replyText = `Yeah sure! I can drop it off at Room ${currentUser.room} in 5-10 mins. Just tap "Place Order" above so I know! 🛵`;
  } else if (lower.includes('spicy') || lower.includes('chilli') || lower.includes('cheese')) {
    replyText = "Haha absolutely! I'll customize it with extra seasoning/chutney for you. 🌶️";
  } else if (lower.includes('upi') || lower.includes('cash') || lower.includes('pay')) {
    replyText = "GPay / Paytm or cash on room delivery both work totally fine! 👍";
  } else if (lower.includes('time') || lower.includes('long') || lower.includes('when')) {
    replyText = "Ready right now! Come by in 2 mins or I'll run up to your floor.";
  }

  setTimeout(() => {
    const chat = allChats[chatId];
    if (!chat) return;

    const replyMsg = {
      id: 'msg_' + Date.now(),
      senderId: partner.id,
      senderName: partner.name,
      text: replyText,
      timestamp: Date.now(),
      type: 'text'
    };

    chat.messages.push(replyMsg);
    chat.lastUpdated = Date.now();
    saveChats();

    if (activeChatContext && activeChatContext.chatId === chatId) {
      const msgContainer = document.getElementById('chatMessagesContainer');
      msgContainer.appendChild(createMessageElement(replyMsg));
      msgContainer.scrollTop = msgContainer.scrollHeight;
      playChime('msg');
    } else {
      showToast(`New message from ${partner.name} (Rm ${partner.room})`, 'success');
      playChime('msg');
      updateChatsBadge();
    }
  }, 1100);
}

function openChatDrawer() {
  const drawer = document.getElementById('chatDrawer');
  const backdrop = document.getElementById('chatBackdrop');
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
}

function closeChatDrawer() {
  const drawer = document.getElementById('chatDrawer');
  const backdrop = document.getElementById('chatBackdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  activeChatContext = null;
  updateChatsBadge();
  if (currentView === 'my-chats') renderMyChats();
}

function updateChatsBadge() {
  const badge = document.getElementById('headerChatsBadge');
  if (!badge) return;

  const chatKeys = Object.keys(allChats);
  badge.textContent = chatKeys.length;
  badge.style.display = chatKeys.length > 0 ? 'flex' : 'none';
}

function saveChats() {
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));
  updateChatsBadge();
}

// ============================================================================
// Helper Utilities
// ============================================================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
