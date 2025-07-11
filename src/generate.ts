import { getPopularTweets } from "@/utils/db";
import { classifyAndSummarize, getStatus } from "./utils/openrouter";
import { getPosts } from "./utils/reddit";
import { getDiscoursePosts } from "./utils/discourse";
import pLimit from "p-limit";

async function main() {
  const status = await getStatus();
  console.log("OpenRouter usage:", status.usage, "/", status.limit);
  console.log();

  const list = "privacy";
  const tweets = await getPopularTweets(list);
  console.log(`Top tweets from the last 7 days`, tweets.length);
  console.log();

  const limit = pLimit(10);
  const classified = await Promise.all(
    tweets.map((tweet) =>
      limit(async () => {
        const ai = await classifyAndSummarize(tweet.text);
        return {
          id: tweet.id,
          username: tweet.username,
          url: `https://x.com/${tweet.username}/status/${tweet.id}`,
          engagement_score: tweet.engagement_score,
          ...ai,
        };
      })
    )
  );

  // log by category with most popular tweets on top
  const byCategory = classified.reduce((acc, tweet) => {
    acc[tweet.category] = acc[tweet.category] || [];
    acc[tweet.category].push(tweet);
    return acc;
  }, {} as Record<string, any[]>);

  console.log("--------------------------------");
  console.log();
  console.log("Announcements");
  console.log(
    byCategory.announcement
      .sort((a: any, b: any) => b.newsworthiness - a.newsworthiness)
      .map((i: any) => `- ${i.summary} ${i.url}`)
      .join("\n")
  );
  console.log();

  console.log("Resources");
  console.log(
    byCategory.informative
      .sort((a: any, b: any) => b.newsworthiness - a.newsworthiness)
      .map((i: any) => `- ${i.summary} ${i.url}`)
      .join("\n")
  );
  console.log();

  console.log("Events");
  console.log(
    byCategory.events
      .sort((a: any, b: any) => b.newsworthiness - a.newsworthiness)
      .map((i: any) => `- ${i.summary} ${i.url}`)
      .join("\n")
  );
  console.log();

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
