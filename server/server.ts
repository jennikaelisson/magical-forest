import express from "express";
import dotenv from "dotenv";
var cors = require("cors");
const bcrypt = require("bcrypt");
import connectToDatabase from "./services/databaseConnection";
import userRoutes from "./resources/users/users.router";
import subscriptionRoutes from "./resources/subscriptions/subscriptions.router";
import contentRoutes from "./resources/content/content.router";
import paymentRoutes from "./resources/payments/payments.router";

let app = express();

const PORT: Number = 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (typeof process.env.DATABASE_URL === "string") {
  let url: string = process.env.DATABASE_URL;

  let connectToDatabase = (url: string): void => {
    console.log("connectToDatabase");
    console.log("url", url);
  };

  connectToDatabase(url);
}

app.use(express.json());

// ROUTES:
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", async (req, res) => {
  res.send("Success");

  const db = await connectToDatabase();
  const [results, fields] = await db.query("SELECT * FROM `pages`");
  res.json(results);
});

// AUTH:

// INNEHÅLL:

app.post("/content", async (req, res) => {
  
});

app.listen(PORT, () => {
  console.log("Started");
});
