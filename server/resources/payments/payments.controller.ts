import { Request, Response } from "express";
import { RowDataPacket } from "mysql2";
import mysql from "mysql2/promise";
import Stripe from "stripe";


interface SubscriptionLevel extends RowDataPacket {
  stripePriceId: string;
}

interface UserInterface extends RowDataPacket {
  email: string;
  stripeSubscriptionId: string;
}

export const checkout = async (req: Request, res: Response): Promise<void> => {
  const { subscriptionLevel, user } = req.body;

  console.log("User: ", user);
  // // console.log("Sub level: ", subscriptionLevel);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("Connected");

  // kolla med en connection.query om emailen finns i subscription
  const [subscriptionRows]: [UserInterface[], any] = await connection.query(
  'SELECT * FROM `subscriptions` WHERE email = ?', [user]);

  
    // if den finns, radera subscription ur databas och gör en cancel till stripe
    if(subscriptionRows.length === 1){
      //radera raden i databasen 
      await connection.query(
        'DELETE FROM `subscriptions` WHERE email = ?',
        [user]
      );
      //radera ur stripe
      const stripeApi = new Stripe(process.env.STRIPE_KEY as string);

      const stripeSubscriptionId = subscriptionRows[0].stripeSubscriptionId;

      try {
        const deletedSubscription = await stripeApi.subscriptions.cancel(stripeSubscriptionId);
        console.log(`Deleted subscription from Stripe: ${stripeSubscriptionId}`);
      } catch (error) {
        console.error(`Failed to delete subscription from Stripe: ${stripeSubscriptionId}`, error);
      }
      // res.status(200).send({ message: "Subscription deleted" });
    
  
    }
  // gå ur if satsen, fortsätt med existerande kod:

  // Genomför betalning via Stripe
  const [rows]: [SubscriptionLevel[], any] = await connection.query(
    "SELECT stripePriceId FROM subscriptionLevels WHERE levelId = ?",
    [subscriptionLevel]
  );
  if (rows.length === 0) {
    res.status(400).send({ error: "Invalid subscription level" });
    return;
  }

  const { stripePriceId } = rows[0];

  //länka produkterna i databasen till ett id i stripe
  try {
    const stripeApi = new Stripe(process.env.STRIPE_KEY as string);

    // Hämta stripePriceId baserat på subscriptionLevel

    let session = await stripeApi.checkout.sessions.create({
      //customer_email: req.session?.user?.email,
      //payment_method_types: ["card"],
      customer_email: user,
      line_items: [
        {
          price: stripePriceId, // Använd pris-ID
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: "http://localhost:5173/Confirmation",
    });

    res.json(session);
    // res.status(200).send({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).send({ error: "Failed to create Stripe checkout session" });
  }
};

export const verifySession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log("Connected verify");

    const stripeApi = new Stripe(process.env.STRIPE_KEY as string);

    const sessionId = req.body.sessionId;
    const userEmail = req.body.user;
    const subLevel = req.body.subLevel;

    console.log("Is it null?", subLevel);

    if (!stripeApi) {
      console.error("Stripe is not defined!");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!sessionId) {
      console.error("Session ID is missing!");
      res.status(400).json({ error: "Session ID is missing" });
      return;
    }

    let session: Stripe.Checkout.Session | undefined;

    try {
      session = await stripeApi.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error("Error retrieving session:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    if (!session) {
      console.error("Session not found!");
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.payment_status !== "paid") {
      console.error("Session not paid!");
      res.status(400).json({ error: "Session not paid" });
      return;
    }

    // HÄMTA SUBSCRIPTION ID FRÅN PAYMENT_STATUS. LOGGA UT SESSION
    console.log("Session: ", session);

    //spara subscription id i databas . i kolumn

    const lineItems = await stripeApi.checkout.sessions.listLineItems(
      sessionId
    );
    console.log("Lineitems: ", lineItems);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Lägger till 7 dagar i millisekunder

    const order = {
      price: session.amount_total,
      email: userEmail,
      //products: JSON.stringify(lineItems.data),
      // userId: session.customer_details,
      paymentStatus: session.payment_status,
      levelId: subLevel,
      startDate: startDate,
      endDate: endDate, // Du kan fylla i det här baserat på din logik
      stripeSubscriptionId: session.subscription,
      isActive: true, // Du kan fylla i det här baserat på din logik
    };

    console.log("session.sub", session.subscription);

    await connection.query("INSERT INTO subscriptions SET ?", [order]);

    console.log("Subscription inserted successfully");
    res.status(200).json({ verified: true });
  } catch (error) {
    console.error("Error verifying session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const retryPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const stripeApi = new Stripe(process.env.STRIPE_KEY as string);
  //console.log("Req body", req.body);

  const { subscriptionId } = req.body;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  let subInfoStripe;

  try {
    subInfoStripe = await stripeApi.subscriptions.retrieve(subscriptionId);
    //console.log("1", subscriptionId, "2",subInfoStripe.latest_invoice);

    const latestInvoice = await stripeApi.invoices.retrieve(
      subInfoStripe.latest_invoice as string
    );
    //console.log(latestInvoice.hosted_invoice_url);

    res.status(200).json(latestInvoice.hosted_invoice_url);
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  // retrieve subscriptionId i stripe - ge mig subscription info -> "latest invoice" retrieve på latest invoice -> payment_link som vi loggar ut på samma sätt som första url
};

export const cancel = async (req: Request, res: Response): Promise<void> => {
  const stripeApi = new Stripe(process.env.STRIPE_KEY as string);
  //console.log("Req body", req.body);

  const { subscriptionId } = req.body;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const subInfoStripe = await stripeApi.subscriptions.retrieve(
      subscriptionId
    );
    console.log(
      "sub ID? ",
      subscriptionId,
      "Cancel at period end? ",
      subInfoStripe.cancel_at_period_end
    );
    //set cancel at period end till true
    const cancelSubscription = await stripeApi.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );
    console.log("Updated subscription: ", cancelSubscription);
    res.status(200).json(cancelSubscription.cancel_at_period_end);
  } catch (error) {
    console.error("Error updating subscription: ", error);
    res.status(500).json({ error: error });
  } finally {
    //console.log(req.body.data.object.status);
    await connection.end();
  }
};

export const webhooks = async (req: Request, res: Response): Promise<void> => {
  switch (req.body.type) {
    case "customer.subscription.updated":
    case 'customer.subscription.deleted':
      console.log("webhooks req.body: ", req.body);
      const subscription = req.body.data.object.id;
      const status = req.body.data.object.status;

      console.log("subscription1 ", subscription, "status: ", status);
      //kolla subscription id i databas och kolla med subscription req.body.data.subscription

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });

      if (status === "active") {
        const [rows]: [mysql.RowDataPacket[], any] = await connection.query(
          "UPDATE `subscriptions` SET `paymentStatus`='paid',`isActive`=1 WHERE `stripeSubscriptionId`= ?",
          [subscription]
        );
        console.log("ACTIVE");
      } else if (status === "past_due") {
        const [rows]: [mysql.RowDataPacket[], any] = await connection.query(
          "UPDATE `subscriptions` SET `paymentStatus`='unpaid',`isActive`=0 WHERE `stripeSubscriptionId`= ?",
          [subscription]
        );
        console.log("PAST_DUE");
      } else if (status === "canceled") {
        const [rows]: [mysql.RowDataPacket[], any] = await connection.query(
          "UPDATE `subscriptions` SET `paymentStatus`='cancelled',`isActive`=0 WHERE `stripeSubscriptionId`= ?",
          [subscription]
        );
        console.log("CANCELLED");
      } // lägg till en till status för cancelled - tex

      // uppdatera databas med status (isActive) + paymentStatus
      break;
    default:
      console.log(req.body.type);
      break;
  }


  res.json({});
};
