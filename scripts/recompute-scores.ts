import { db, pgClient } from "@/db/client";
import { recomputeScores } from "@/server/scoring-service";

recomputeScores(db)
  .then((n) => console.log(`✔ Puntajes recalculados para ${n} negocios`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
