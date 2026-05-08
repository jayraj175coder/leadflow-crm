import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8000);

app.listen(port, () => {
  console.log(`LeadFlow API running on http://localhost:${port}`);
});
