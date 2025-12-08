# how i would implement Stripe Checkout for an application fee.

I would keep an application_fee_amount in the application record stored in Supabase.

I’d call a Supabase Edge Function like /create-checkout-session for the frontend.

That function would trigger a Stripe Checkout Session creation process utilizing the Stripe secret key.

The function checks the validity of user + tenant + application before proceeding to create the session.

The parameters sent to Stripe Checkout include: price, quantity set to 1, success_url, cancel_url, and metadata (application_id, user_id).

The function executes and the session.url is sent back to the client.

The frontend does the redirection of the user to Checkout by using window.location = session.url.

Post payment, a Webhook sends the notification from Stripe (which is also implemented as an Edge Function).

The webhook does the signature verification of the event and checks if event.type is 'checkout.session.completed'.

If the payment is successful, the webhook makes a Supabase update: applications.status = 'paid' or just inserts a new payment record.

Optionally: a Supabase Realtime event could be emitted like "application.payment_completed".

The frontend either polls or subscribes to realtime in order to display the updated status.