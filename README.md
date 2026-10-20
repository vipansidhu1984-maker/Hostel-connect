# HostelConnect 🍲🏨

> **College Hostel Food Marketplace & In-App Student Chat**

HostelConnect is a hyper-local web application tailored for college students living in hostel rooms. Students can snap live camera photos of extra food, homemade snacks, or late-night Maggi, set a price tag, and list them directly on the hostel feed. Other students in the hostel can browse, search, and order via the instant in-app chat with sound chimes and live order tracking.

---

## ✨ Features

- **Quick Student Login**: Simple and lightweight onboarding requiring only your Name and Room Number.
- **Camera-Only Food Photo Capture**: Directly trigger your device camera to capture authentic, real-time pictures of your food before listing.
- **Live Hostel Marketplace**:
  - Real-time search by food name, description, seller, or room number.
  - Price sorting (Low to High, High to Low, Recommended).
  - Clean creamy and greenish palette (`#FAF7F0`, matcha/sage green accents).
- **In-App Room Chat & Ordering**:
  - One-tap "Order & Chat" button to connect directly with the seller's room.
  - Interactive food order cards with status updates (Pending ➔ Confirmed ➔ Delivered).
  - Realistic simulated hostel student responses & Web Audio chimes for notifications.
  - Quick reply chips for fast late-night ordering.
- **My Food Stash & Messages**:
  - Manage listed items (track portions, remove completed items).
  - Threaded conversation drawer accessible from anywhere in the app.

---

## 🛠️ Technology Stack

- **Frontend**: Pure Semantic HTML5, Vanilla CSS3 (Custom design system with CSS variables, light creamy/greenish theme), Vanilla Modern JavaScript (ES6+).
- **Backend / Dev Server**: Zero-dependency Node.js HTTP server.
- **Storage**: Browser LocalStorage for persistence across reloads.
- **Audio**: Web Audio API synthesized chimes.

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Hostel-connect
```

### 2. Start the local server
```bash
npm start
# or
node server.js
```

### 3. Open in Browser
Visit [http://localhost:3000](http://localhost:3000) in your web browser or mobile browser on the same Wi-Fi network.

---

## 📸 Usage Guide

1. Enter your Name and Room Number on the login prompt.
2. Click **➕ List Food**.
3. Tap **Take Photo with Camera** to snap a photo of your food item.
4. Set the item title, price in ₹, portions, and delivery preferences (pickup/room drop).
5. Tap **Publish Food Listing** to make it instantly visible to all hostel students!
