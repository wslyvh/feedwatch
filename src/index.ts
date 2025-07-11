import { fetchTweets, type Tweet } from "nitter-scraper";
import { getUsernames } from "./utils/lists";
import { insertTweets } from "@/utils/db";

async function main() {
  const since = new Date();
  since.setDate(since.getDate() - 2);

  const list = "privacy";
  const handles = await getUsernames(list);
  console.log(`Handles found for ${list}: ${handles.length}`);

  const allTweets: Tweet[] = [];
  const topTweets: Tweet[] = [];

  for (const handle of handles) {
    console.log(`- ${handle}`);
    const feed = await fetchTweets(handle, since);

    allTweets.push(...feed);
    if (feed.length === 0) continue;

    const sorted = [...feed].sort(
      (a, b) => b.engagement_score - a.engagement_score
    );

    topTweets.push(
      ...sorted.slice(0, 3).map((t) => ({ ...t, username: handle }))
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`Total tweets found: ${allTweets.length}`);
  console.log(
    allTweets.map((t) => `${t.username} - ${t.text.slice(0, 24)}...`).join("\n")
  );
  console.log();

  console.log(`Top tweets to save: ${topTweets.length}`);
  console.log(
    topTweets.map((t) => `${t.username} - ${t.text.slice(0, 24)}...`).join("\n")
  );

  await insertTweets(topTweets, list);
}

main().then(
  () => {
    console.log("All done!");
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
