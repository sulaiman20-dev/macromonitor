# 🥩 Macro Monitor

A macro + electrolyte tracker powered by Claude AI. Describe what you ate in natural language and Claude breaks it down into individual ingredients with full nutritional data.

## Features

- **Natural language food input** — type or speak what you ate
- **Claude AI parsing** — breaks combos into ingredients, estimates portions, calculates macros + electrolytes
- **Custom foods** — LMNT, Fairlife, and any branded items with exact label values
- **Daily tracking** — running totals for calories, protein, fat, net carbs, sodium, potassium, magnesium
- **Weekly charts** — Recharts line charts for macros and electrolytes
- **Target warnings** — protein < 145g, net carbs outside 30-45g, weekly fat > 80g
- **Google Form submission** — generates prefilled links to log daily totals to Google Sheets
- **Voice input** — Web Speech API for hands-free logging
- **Data backup** — JSON import/export

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub

```bash
# Create a new repo on GitHub, then:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/macro-monitor.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `macro-monitor` repo
4. In the **Environment Variables** section, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (get one at [console.anthropic.com](https://console.anthropic.com))
5. Click **Deploy**

That's it. You'll get a URL like `https://macro-monitor-abc123.vercel.app` that works on your phone.

### 3. (Optional) Custom domain

In Vercel project settings → Domains, you can add a custom domain.

## Architecture

```
pages/
  index.js        → Main app (React, client-side)
  api/
    parse.js       → Serverless function that proxies Claude API calls
```

- **Client side**: React app with localStorage for data persistence
- **Server side**: `/api/parse` serverless function calls Claude with your API key (kept secret server-side)
- The client sends `{ text, customFoods }` to `/api/parse`, which returns `{ items: [...] }`

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run dev server
npm run dev
# Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

## Google Form Integration

The app generates prefilled Google Form links using these field mappings:
- Date → `entry.2005875987`
- Fat (g) → `entry.177798724`
- Protein (g) → `entry.274477235`
- Net Carbs (g) → `entry.627541876`
- Calories → `entry.17219735`
- Sodium (mg) → `entry.2109942087`
- Potassium (mg) → `entry.75882861`
- Magnesium (mg) → `entry.1303264367`

To use your own form, update the `FORM` and `FM` constants in `pages/index.js`.
