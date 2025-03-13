const app = require("./app");
const dotenv = require("dotenv");
const db = require("./db");
dotenv.config({ path: "./config.env" });

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`App listening on ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  console.log("Unhandled rejection. Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;
