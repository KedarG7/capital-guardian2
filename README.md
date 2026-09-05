# Capital Guardian

Capital Guardian is a decision-support prototype built for the hackathon, designed to simulate intelligent capital management, risk tracking, and automated control recommendations.

> **DISCLAIMER**: Capital Guardian is a hackathon decision-support prototype. It does NOT execute real trades, does NOT connect to a broker, and does NOT provide real financial advice. All data and recommendations are simulated for demonstration purposes.

## Problem Statement

Managing capital securely requires real-time risk evaluation and immediate response strategies when markets shift. Traditional systems often lack transparent, explainable recommendations when thresholds are breached.

## Solution

Capital Guardian solves this by providing a unified workspace that bridges capital allocation, continuous risk monitoring, simulated market shocks, and deterministic control actions. When risk thresholds are exceeded, the platform recommends constrained asset rebalancing strategies and explains exactly why the decision was made.

## Key Features

1. **Optimize**: Allocate capital dynamically under risk and liquidity constraints.
2. **Monitor**: Track portfolio risk, liquidity, and market conditions in real time.
3. **Simulate**: Test what-if market shocks before they impact your capital.
4. **Control**: Generate deterministic, risk-aware rebalancing recommendations.
5. **Explain**: Understand the "why" behind every decision through a transparent Decision Center.

## Architecture

- **Frontend**: React, Vite, Tailwind CSS. A modern SPA with separate authenticated routes (`/overview`, `/optimization`, `/what-if`, `/controls`).
- **Backend**: Node.js, Express. REST API powering deterministic financial engines.
- **Authentication**: JWT-based authentication with bcrypt password hashing. Google Sign-In ready.
- **Database**: MongoDB (Mongoose) for secure, isolated persistence of user configurations and decision history.

## Financial Engines

- **Calculation Approach**: Evaluates invested amounts, total value, expected returns, liquidity scores, and weighted portfolio volatility.
- **Optimization Approach**: A deterministic constrained optimizer that searches for allocations maximizing risk-adjusted return while strictly adhering to user-defined risk/liquidity limits.
- **Risk Engine**: Monitors capital against maximum volatility and minimum liquidity boundaries, generating `LOW`, `MODERATE`, `HIGH`, or `CRITICAL` statuses.
- **Market Data Layer**: Fetches current asset prices. Fails over gracefully to DEMO mode if live data is unavailable.
- **Market Response**: Analyzes market shifts against the active portfolio, detecting significant changes.
- **Control / Rebalancing**: Automatically suggests asset weight rebalancing if risk thresholds are breached, ensuring constraints are satisfied.
- **Explainability**: Generates deeply structured explanations detailing the trigger, expected impact, before/after metrics, and satisfied constraints.

## Environment Variables

Copy `.env.example` to `.env` in both `frontend` and `backend`.

**Backend (.env):**
- `PORT=5000`
- `MONGO_URI=mongodb://localhost:27017/capital-guardian` (optional)
- `JWT_SECRET=your_secret_here`

**Frontend (.env):**
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_GOOGLE_CLIENT_ID=your_client_id_here` (optional)

## Demo vs Live Mode

Capital Guardian automatically uses **DEMO** market data for maximum stability if a live data provider is unconfigured or fails. The UI clearly labels the active data source as `LIVE` or `DEMO`. The engine will always use a fixed starting portfolio if MongoDB is not provided.

## How to run locally

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Testing
Run `npm run test` in the `backend/` directory to verify the deterministic financial logic.

## Limitations

- This is a hackathon prototype.
- Market models use simplified volatility assumptions.
- No live broker connections.
- Optimization uses a basic deterministic search space, not a full convex optimizer.
