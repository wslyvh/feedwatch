export async function getPosts(
  subreddit: string,
  query: string,
  limit: number = 50,
  time: "hour" | "day" | "week" | "month" | "year" | "all" = "week"
) {
  console.log(`Fetching ${limit} posts from /r/${subreddit} for ${query}`);

  // Get OAuth2 access token
  const clientId = process.env.REDDIT_APP_ID;
  const clientSecret = process.env.REDDIT_APP_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing Reddit app credentials");

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "feedwatch/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok)
    throw new Error(`Failed to get Reddit token: ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${query}&restrict_sr=1&t=${time}&sort=top&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "feedwatch/1.0",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);

  const data = await res.json();
  if (data?.data?.children?.length === 0) {
    console.log("No posts found");
    return [];
  }

  return data.data.children
    .map((child: any) => child.data)
    .map((post: any) => ({
      title: post.title,
      url: `https://reddit.com${post.permalink}`,
      score: post.score,
      created_utc: new Date(post.created_utc * 1000).toISOString(),
    }));
}
