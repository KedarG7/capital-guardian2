# Capital Guardian

Capital Guardian is a FinTech capital management and optimization prototype.

## Current status

**STEP 12 - Final Integration and Demo Readiness**

Steps 0–11 establish the complete deterministic capital-management prototype. Step 12 verifies the integrated login, dashboard, financial engines, persistence boundaries, and explainability flow.

## Tech stack

- Frontend: React, Vite, JavaScript, Tailwind CSS
- Backend: Node.js, Express, JavaScript
- Database: MongoDB with Mongoose persistence
- Authentication: bcryptjs password hashing and JWT

## Project structure

```text
capital-guardian/
├── frontend/                 React + Vite application
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── utils/
├── backend/                  Node.js + Express application
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── control-engine/
│   │   ├── financial-engine/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── risk-engine/
│   │   ├── shock-engine/
│   │   ├── services/database/
│   │   └── services/explainability/
│   │   └── utils/
│   └── tests/
├── .env.example
└── .gitignore
```

## Installation

Install dependencies in each application folder:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Run the complete backend regression suite with `npm.cmd --prefix backend test`. The frontend has no lint script configured; build it with `npm.cmd --prefix frontend run build`.

## Run the frontend

```bash
cd frontend
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

## Run the backend

```bash
cd backend
npm run dev
```

The backend listens on port `5001` by default in this workspace. Set `PORT` in a local `.env` file if needed. MongoDB is not required to start the server.

## Health endpoint

With the backend running, request:

```text
GET http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "capital-guardian-backend"
}
```

## Portfolio Calculation Engine

The engine is available from `backend/src/financial-engine/portfolio-calculation.js` through `calculatePortfolioMetrics(portfolio)`. It calculates invested amount per asset, total portfolio value, weighted expected return, weighted liquidity score, and portfolio volatility.

The formulas are:

- Invested amount: `totalCapital * allocation`
- Expected return: `sum(allocation * expectedReturn)`
- Liquidity score: `sum(allocation * liquidityScore)`
- Volatility: `sqrt(sum((allocation * volatility) ** 2))`

The volatility calculation uses a simplified zero-correlation assumption because STEP 1 does not provide correlations. This is a simplified hackathon demonstration model and is not financial advice.

## Portfolio Optimization Engine

The optimizer is available from `backend/src/financial-engine/portfolio-optimization.js` through `optimizePortfolio(portfolio)`. It performs a deterministic exhaustive grid search using 5 percentage-point allocation steps. Candidates are rejected unless they satisfy the allocation bounds, total allocation, maximum risk, and minimum liquidity constraints.

The selected candidate maximizes `expectedReturn / volatility`. Ties are resolved by higher expected return, lower volatility, higher liquidity, and then stable asset ordering. A zero-volatility candidate is handled explicitly without producing an infinite or NaN score.

This is a simplified demonstration model for the hackathon and is not financial advice or a production investment recommendation.

## Risk Engine

The Risk Engine is available from `backend/src/financial-engine/risk-assessment.js` through `assessPortfolioRisk(portfolio)`. It consumes the existing Portfolio Calculation Engine, checks volatility against `maximumRisk`, liquidity against `minimumLiquidity`, and each allocation against its configured bounds. It reports utilization, liquidity buffer, status, and structured breaches without changing the portfolio.

Risk utilization is `portfolioVolatility / maximumRisk`, with zero maximum risk handled safely. Liquidity buffer is `liquidityScore - minimumLiquidity`. Status precedence is CRITICAL when both risk and liquidity breach, HIGH for any limit or allocation breach, MODERATE when utilization is at least `0.75` without a breach, and LOW otherwise.

These risk-status thresholds are simplified demonstration rules for the hackathon and are not regulatory or investment advice.

## Market Shock + What-If Simulator

The simulator is available from `backend/src/shock-engine/market-shock.js` through `simulateMarketShock(portfolio, scenario)`. A market shock is a hypothetical percentage change applied to an asset value. The simulator calculates shocked asset values, total value, gain or loss, new allocation weights, expected return, liquidity, and volatility using the existing calculation model.

After calculating the shocked metrics, the simulator passes the derived portfolio to the existing Risk Engine. It reports the resulting risk status and breaches without changing the original portfolio or executing trades. Demo scenarios include Market Crash, Inflation Shock, and Positive Market.

This is a simplified deterministic hackathon simulation using hypothetical shocks. It is not a market prediction, investment recommendation, or financial advice.

## Control & Rebalancing Engine

The control engine is available from `backend/src/control-engine/control-rebalancing.js` through `evaluateControl(portfolio)`. It reads the existing Risk Engine assessment and returns `NO_ACTION`, a rebalancing recommendation, or a breach state. It reuses the existing constrained optimizer to find a target allocation that respects asset bounds, risk, and liquidity where feasible.

Every recommendation is validated, recalculated, and reassessed by the existing Step 1, Step 2, and Step 4 engines. Results include before/after metrics, per-asset changes, risk/liquidity/return impact, and deterministic explanations. Impossible constraints return a structured failure and no invented allocation.

This is a simplified deterministic hackathon prototype. It does not execute trades and does not provide financial or investment advice.

## Backend API

The Express API exposes the existing financial engines to the future frontend. These APIs calculate and return simulated recommendations only; they do not execute real financial transactions.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Confirm that the backend is running. |
| GET | `/api/portfolio` | Return the demo portfolio, calculated metrics, and risk assessment. |
| POST | `/api/optimize` | Run the existing constrained optimization engine. |
| POST | `/api/risk` | Run the existing Risk Engine for a submitted portfolio. |
| POST | `/api/simulate` | Run a Step 5 market shock scenario. |
| POST | `/api/control` | Run the Step 6 control and rebalancing recommendation. |
| POST | `/api/analyze` | Run calculation, optimization, risk, and control analysis together. |
| GET | `/api/scenarios` | Return the existing demo shock scenarios. |
| POST | `/api/explain` | Return a deterministic explanation for an engine result. |
| POST | `/api/auth/register` | Create a user when MongoDB is available. |
| POST | `/api/auth/login` | Authenticate a user and return a JWT. |
| GET | `/api/auth/me` | Return the authenticated safe user. |

POST requests accept JSON. Portfolio endpoints accept a portfolio directly or inside `{ "portfolio": { ... } }`. The simulation endpoint accepts `{ "portfolio": { ... }, "scenario": { "name": "Market Crash", "shocks": [...] } }`.

Successful API responses use `{ "success": true, "data": ... }`. Invalid JSON, invalid input, domain constraint failures, and unknown routes return structured errors without stack traces. Local CORS allows the origin configured by `FRONTEND_URL`, defaulting to `http://localhost:5173`.

## MongoDB Persistence

STEP 9 adds MongoDB persistence through Mongoose. MongoDB stores submitted portfolios and history from the existing calculation, risk, simulation, and control engines; it does not perform financial calculations.

Install MongoDB locally or use a MongoDB Atlas deployment, then copy `.env.example` to `backend/.env` and set `MONGODB_URI` and `JWT_SECRET` there. The backend explicitly loads `backend/.env` before initializing the Express application. The backend connects lazily when a persistence endpoint is called, so the existing demo and engine endpoints remain usable without MongoDB. Persistence/auth endpoints return a clear `503` error when MongoDB is not configured or unavailable.

Collections are created by Mongoose as needed:

- `portfolios`
- `analyses`
- `scenarioresults`
- `controldecisions`

Persistence endpoints include `POST /api/portfolio`, `POST /api/analysis`, `GET /api/analysis/history`, `POST /api/scenarios/results`, `GET /api/scenarios/history`, `POST /api/control/history`, and `GET /api/control/history`. `GET /api/portfolio` retrieves the newest stored portfolio when MongoDB is configured and otherwise uses the existing demo portfolio.

## Authentication

STEP 10 adds JWT authentication with bcrypt password hashing. `POST /api/auth/register` creates a user, `POST /api/auth/login` returns a token, and `GET /api/auth/me` returns the safe authenticated user. Financial and history APIs require `Authorization: Bearer <token>`; `/api/health` and the auth endpoints remain public.

Set `JWT_SECRET` to a long random value in the local environment. Passwords are never stored or returned, and persisted portfolios and histories are associated with the authenticated user. The React app stores only the JWT and safe user information in local storage for this prototype, and clears both when a token expires or the user signs out.

MongoDB must be available for registration and login because users are persisted in the `users` collection. Without MongoDB, auth endpoints return a clear configuration/database error rather than creating fake accounts.

## Explainability

STEP 11 adds a deterministic explainability layer at `backend/src/services/explainability/explainability-service.js` and the protected `POST /api/explain` endpoint. It consumes existing risk, optimization, simulation, control, or full-analysis results and returns a structured summary, decision, reasons, metrics, actions, impact, and `DETERMINISTIC` confidence marker.

The dashboard displays this result in the “Why did Capital Guardian make this decision?” panel. Explanations use actual engine output, do not recalculate financial values, do not use AI, and do not provide investment advice.

## Final Architecture

```text
React Dashboard
  ↓
Express API + JWT middleware
  ↓
Financial Engines
  ↓
Mongoose persistence
```

The decision flow is:

```text
Portfolio → Calculation → Optimization → Risk → What-If → Control → Explainability
```

The engines are deterministic and transparent. MongoDB stores portfolios and result history; it does not perform financial calculations. AI is not required for the core decision engine.

## Final Demo Flow

1. Configure `MONGODB_URI` and `JWT_SECRET`.
2. Start the backend and frontend.
3. Register or log in.
4. Review the ₹1 crore simulated portfolio.
5. Run Optimize Portfolio.
6. Run the Market Crash What-If scenario.
7. Generate the control recommendation.
8. Review before/after allocation and the explanation panel.
9. Run Full Analysis and review persisted history when MongoDB is available.
10. Sign out and confirm the dashboard is protected.

## Disclaimer

This is a hackathon prototype using simplified financial models and simulated data. It is not financial, investment, regulatory, or trading advice.

## Future Feature Firewall

The prototype intentionally excludes AI, chatbots, machine learning, advanced risk models, real-time market APIs, broker integration, trading, payments, notifications, 2FA, and biometric authentication.
