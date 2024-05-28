import express from "express";

type test = {
    name: string
    id: bigint
}

let app = express();

app.get("/", (req, res) => {
    res.send("Success");
});

app.listen(3001, () => {
    console.log("Started");
});
