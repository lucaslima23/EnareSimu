import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const YOUR_DOMAIN = 'https://enare-simu.vercel.app'; // Substitua pelo domínio real do seu projeto

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: 'price_1RtBOzB5NHfF0Eg6VjPf2sW9', // <<< SEU PRICE ID AQUI
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN}/?success=true`,
    cancel_url: `${YOUR_DOMAIN}/?canceled=true`,
  });

  res.redirect(303, session.url);
};
