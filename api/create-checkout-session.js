import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const YOUR_DOMAIN = 'https://enare-simu.vercel.app';

export default async (req, res) => {
  // A verificação de método continua, pois o front-end agora envia um POST
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1RtBOzB5NHfF0Eg6VjPf2sW9',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/?success=true`,
      cancel_url: `${YOUR_DOMAIN}/?canceled=true`,
    });

    // Retorna a URL de checkout do Stripe em formato JSON
    res.status(200).json({ url: session.url });

  } catch (error) {
    // Em caso de erro, retorna um status 500 com a mensagem de erro
    res.status(500).json({ error: { message: error.message } });
  }
};
