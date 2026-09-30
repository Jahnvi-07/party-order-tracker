# Party Order Tracker

A simple mobile-first shared order tracker. Multiple people can open the same party URL and see quantity changes in real time.

## 1. Create Supabase project

Create a free Supabase project at https://supabase.com/.

Open **SQL Editor** and run the contents of `supabase.sql`.

Then open **Project Settings → API** and copy:
- Project URL
- Publishable/anon public key

## 2. Configure the site

Copy `config.example.js` to `config.js` and replace the placeholders:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```

Only use the public anon/publishable key. NEVER use a `service_role` key in the browser.

## 3. Customize dishes

Edit `DEFAULT_DISHES` near the top of `script.js`.

## 4. Test locally

Use a local static server, for example:

```bash
python3 -m http.server 5500
```

Then open http://localhost:5500.

## 5. Deploy to Vercel

Push the folder to GitHub and import the repository into Vercel.

The site is static, so no build command is required.

Important: `config.js` contains your public anon key, which is designed to be exposed in a browser. Do not put secrets/service-role keys in it.

## Party sharing

When the first person opens the site without a `party` parameter, the app creates a random party ID and changes the URL to:

`https://your-site.vercel.app/?party=<id>`

Copy that URL and send it to the other person. Anyone with that URL can edit that party's order. This version is intended for a casual party and does not provide private authentication.

## Food type + search update

This version adds Veg / Non-Veg filtering and dish search. Run the updated `supabase.sql` once in Supabase SQL Editor to add the `food_type` column to an existing `orders` table. Existing orders are preserved; old rows default to Veg because their previous version did not store food type.
