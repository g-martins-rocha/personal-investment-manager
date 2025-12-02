# Personal Investment Manager (Portfolio Version)

A comprehensive, offline-first Single Page Application (SPA) designed for advanced investment portfolio management. 

This project demonstrates the capability to build complex financial systems using pure web technologies (**Vanilla JavaScript**, HTML5, CSS3), focusing on performance, data integrity, and sophisticated financial logic without relying on heavy frameworks.

## 🚀 Key Features

### 1. Smart Rebalancing Engine
- **Dual-Mode Strategy:** Supports rebalancing by macro-category (e.g., 60/40 split) or by individual asset scoring.
- **Quality Scoring Algorithm:** Prioritises asset purchases based on a composite score of Dividend Yield, Price-to-Book (P/B), and Benjamin Graham's valuation formula.
- **Safety Locks:** Prevents selling assets at a loss during rebalancing suggestions automatically.

### 2. Advanced Performance Tracking
- **Event Sourcing Architecture:** The system reconstructs the portfolio state (average price, current balance) by replaying the entire history of transactions, splits, and dividends rather than storing static balances.
- **Total Return Calculation:** Tracks performance accounting for both capital gains and income (dividends/interest).
- **Internal Rate of Return (IRR/TIR):** Calculates the real profitability of the portfolio over time.

### 3. Offline-First Architecture
- **Data Privacy:** Runs entirely in the browser. Data is persisted using `localStorage` and can be exported/imported via JSON files.
- **Zero Dependencies:** Built without React, Vue, or Angular to demonstrate mastery of core JavaScript fundamentals and DOM manipulation.

## 🛠 Technical Highlights

- **Architecture:** MVC-inspired pattern implemented in Vanilla JS.
- **State Management:** Custom state handling derived from transaction logs (Ledger logic).
- **UI/UX:** Responsive layout with dynamic dashboards, interactive charts (Chart.js), and "ticker tape" updates.
- **Financial Logic:** Implementation of complex formulas for Average Cost, Yield on Cost (YoC), and Compound Annual Growth Rate (CAGR).

## 📦 How to Run

Since this is a client-side application with no backend requirements:

1. Clone this repository or download the ZIP file.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox).
3. The application will start immediately with a clean database (or load demo data if configured).

## 👨‍💻 Author

**Gustavo Martins Rocha** *Fintech Product Developer & Analyst* Wembley, UK

---
*Note: This project was originally designed for the Brazilian market (handling complex tax rules and specific asset classes like FIIs) and has been adapted for this portfolio demonstration.*
