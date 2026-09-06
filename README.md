# Capital Guardian

## PURPOSE:
Automated capital optimization and risk-control platform.

## CORE FLOW:
Market Data
→ Change Detection
→ Portfolio Risk
→ Optimization/Recommendation
→ AI Explanation
→ User Review

## TECH STACK:
- React
- Vite
- Tailwind
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Gemini (if configured)

## IMPORTANT ARCHITECTURE PRINCIPLE:
"Deterministic financial engines calculate portfolio metrics, risk and recommendations. AI is used only to explain verified system decisions."

## Demo vs Live Mode
Capital Guardian uses **DEMO** market data for deterministic presentation during the hackathon. A live data provider can be configured, and the UI will dynamically label the data source as `LIVE` or `DEMO`. 

## Environment Variables
Ensure `.env` files are correctly set up (do not commit them).

**Backend (`backend/.env`)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/capital_guardian
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_key (optional)
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
```

## Setup & Running
1. Start MongoDB locally (`mongod`).
2. Backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Testing
Run `node --test` (or `npm test`) in the `backend/` directory to run the financial regression suite.

## Security Notes
Never commit `.env` files or hardcode API keys/JWT secrets in the source code. The `.gitignore` prevents `.env` check-ins.

> **DISCLAIMER**: Capital Guardian is a hackathon decision-support prototype. It does NOT execute real trades, does NOT connect to a broker, and does NOT provide real financial advice. All data and recommendations are simulated for demonstration purposes.
