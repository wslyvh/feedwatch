// get posts from a Discourse forum (e.g. https://ethresear.ch/) that includes the word 'privacy' from past week

export async function getDiscoursePosts(
  baseUrl: string,
  query: string = "privacy",
  days: number = 7
) {
  console.log(`Fetching past ${days} days from ${baseUrl} for ${query}`);
  // Calculate the date string for 'after:' filter
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD
  const fullQuery = `${query} after:${sinceDate}`;

  const url = `${baseUrl.replace(/\/$/, "")}/search.json?q=${encodeURIComponent(
    fullQuery
  )}`;

  console.log(`Full url: ${url}`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "feedwatch/1.0",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);

  const data = await res.json();
  if (data?.topics?.length === 0) {
    console.log("No posts found");
    return [];
  }

  return data.topics.map((topic: any) => ({
    id: topic.id,
    title: topic.title,
    url: `${baseUrl.replace(/\/$/, "")}/t/${topic.slug}/${topic.id}`,
    created_at: topic.created_at,
    tags: topic.tags,
    score: topic.posts_count + topic.reply_count,
  }));
}
