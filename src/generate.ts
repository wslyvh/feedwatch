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
  const days = 7;
  const tweets = await getPopularTweets(list, days);
  console.log(`Top tweets from the last ${days} days`, tweets.length);
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
  // Helper function to group by score and display
  const displayByScore = (items: any[], categoryName: string) => {
    console.log(`### ${categoryName}`);

    // Group items by newsworthiness score
    const byScore = items.reduce((acc, item: any) => {
      const score = item.newsworthiness;
      acc[score] = acc[score] || [];
      acc[score].push(item);
      return acc;
    }, {} as Record<number, any[]>);

    // Get scores in descending order
    const scores = Object.keys(byScore)
      .map(Number)
      .sort((a, b) => b - a);

    // Display each score group
    scores.forEach((score, index) => {
      console.log(`Score ${score}:`);
      byScore[score].forEach((item: any) => {
        console.log(`- ${item.summary} ${item.url}`);
      });

      // Add empty line between scores, but not after the last one
      if (index < scores.length - 1) {
        console.log();
      }
    });
    console.log();
  };

  displayByScore(byCategory.announcement || [], "Updates");
  displayByScore(byCategory.informative || [], "Resources");
  displayByScore(byCategory.events || [], "Events");

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

  console.log("### Research");
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
