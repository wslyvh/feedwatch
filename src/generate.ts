import { getPopularTweets } from "@/utils/db";
import { getPosts } from "./utils/reddit";
import { getDiscoursePosts } from "./utils/discourse";

async function main() {
  const list = "privacy";
  const majorNews = await getPopularTweets(list);

  console.log(`Top major news tweets from the last 7 days`, majorNews.length);

  for (const tweet of majorNews) {
    console.log(
      `@${tweet.username} (${tweet.engagement_score}): ${tweet.text.slice(
        0,
        32
      )}...`
    );
    console.log(`https://x.com/${tweet.username}/status/${tweet.id}`);
    console.log();
    console.log("--------------------------------");
    console.log();
  }

  // Reddit
  const redditPosts = await getPosts("ethereum", "privacy");
  console.log(`Reddit posts`, redditPosts.length);
  console.log(redditPosts.map((i: any) => `- ${i.title} ${i.url}\n`).join(""));
  console.log();
  console.log("--------------------------------");
  console.log();

  // Discourse
  const ethresearch = await getDiscoursePosts(
    "https://ethresear.ch/",
    "privacy"
  );
  const ethmagicians = await getDiscoursePosts(
    "https://ethereum-magicians.org/",
    "privacy"
  );
  console.log(`Ethresearch posts`, ethresearch.length);
  console.log(`Ethmagicians posts`, ethmagicians.length);
  console.log();
  console.log("--------------------------------");
  console.log();

  console.log("Research");
  console.log(
    [...ethresearch, ...ethmagicians]
      .sort((a, b) => b.created_at - a.created_at)
      .map((i: any) => `- ${i.title} ${i.url}\n`)
      .join("")
  );
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
