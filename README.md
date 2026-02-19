# 💜 Udhaari — Smart Khata App v2.0

> OkCredit se behtar! Purple + Gold luxury theme. All 3 phases complete.

## 🚀 Features (All Phases)

### Phase 1 — Core
- Email + Phone OTP Login
- Dashboard — Total Lena/Dena with Net Balance
- Customer Add/Edit/Delete
- Credit & Debit Transactions with date + note
- WhatsApp + SMS + Call one-click reminders
- Real-time Firebase sync (instant)

### Phase 2 — Analytics & Management
- Monthly/Weekly cash flow graphs (Recharts)
- Pie chart — balance distribution
- Top Debtors list
- PDF Export — individual customer + full report
- Due Dates with Overdue alerts & highlights
- Customer Tags (VIP / Regular / Defaulter)
- Transaction search & filter
- Filter pills (Lena/Dena/Overdue/VIP/Defaulter)
- Running balance in transaction history
- Quick stats dashboard

### Phase 3 — Advanced Features
- Hindi/English language toggle
- PIN Lock security (4-digit, stored securely)
- UPI QR Code generator (with download as PNG)
- Interest Calculator (monthly, with presets)
- Undo last transaction (8 second window)
- Business name in PDF reports
- Customer due date + overdue highlight on home
- Delete confirmation for safety

---

## 🛠️ Setup

### 1. Firebase Setup
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable Authentication: Email/Password + Phone
4. Create Firestore Database (production mode)
5. Copy your config to src/firebase/config.js

### 2. Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Install and Run
```
npm install
npm run dev
```

### 4. Deploy to GitHub Pages
```
# vite.config.js mein base change karo:
base: '/your-repo-name/'

# Deploy:
npm run deploy
```

---

## Tech Stack

React 18 + Vite, Firebase (Auth + Firestore), Recharts, jsPDF, QRCode.js, React Router v6, GitHub Pages

Made with 💜 — Udhaari App v2.0
