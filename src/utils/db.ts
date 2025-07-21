import { createClient, type Client } from "@libsql/client";
import type { Tweet } from "nitter-scraper";
import path from "path";

let db: Client | undefined;

async function initDb(listName: string) {
  if (db) return db;

  console.log("Initializing DB", listName);
  const dbPath = path.resolve("data", `${listName}.sqlite`);
  db = createClient({ url: `file:${dbPath}` });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tweets (
      id TEXT PRIMARY KEY,
      text TEXT,
      username TEXT,
      created_at TEXT,
      timestamp INTEGER,
      replies INTEGER,
      retweets INTEGER,
      likes INTEGER,
      engagement_score REAL,
      type TEXT,
      reference_id TEXT,
      reference_username TEXT
    )
  `);

  return db;
}

export async function insertTweet(tweet: Tweet, listName: string) {
  const db = await initDb(listName);

  await db.execute({
    sql: `INSERT OR IGNORE INTO tweets (
      id, text, username, created_at, timestamp, replies, retweets, likes, engagement_score, type, reference_id, reference_username
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      tweet.id,
      tweet.text,
      tweet.username,
      tweet.created_at,
      tweet.timestamp,
      tweet.replies,
      tweet.retweets,
      tweet.likes,
      tweet.engagement_score,
      tweet.type,
      tweet.reference?.id ?? null,
      tweet.reference?.username ?? null,
    ],
  });
}

export async function insertTweets(tweets: Tweet[], listName: string) {
  if (!tweets.length) return;

  const db = await initDb(listName);

  await db.batch(
    [
      ...tweets.map((tweet) => ({
        sql: `INSERT OR IGNORE INTO tweets (
        id, text, username, created_at, timestamp, replies, retweets, likes, engagement_score, type, reference_id, reference_username
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          tweet.id,
          tweet.text,
          tweet.username,
          tweet.created_at,
          tweet.timestamp,
          tweet.replies,
          tweet.retweets,
          tweet.likes,
          tweet.engagement_score,
          tweet.type,
          tweet.reference?.id ?? null,
          tweet.reference?.username ?? null,
        ],
      })),
    ],
    "write"
  );
}

export async function getTweetById(id: string, listName: string) {
  const db = await initDb(listName);

  const result = await db.execute({
    sql: "SELECT * FROM tweets WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToTweet(row) : undefined;
}

export async function getAllTweets(listName: string) {
  const db = await initDb(listName);

  const result = await db.execute("SELECT * FROM tweets");
  return result.rows.map(rowToTweet);
}

export async function updateTweet(tweet: Tweet, listName: string) {
  const db = await initDb(listName);

  await db.execute({
    sql: `UPDATE tweets SET
      text = ?,
      username = ?,
      created_at = ?,
      timestamp = ?,
      replies = ?,
      retweets = ?,
      likes = ?,
      engagement_score = ?,
      type = ?,
      reference_id = ?,
      reference_username = ?
      WHERE id = ?`,
    args: [
      tweet.text,
      tweet.username,
      tweet.created_at,
      tweet.timestamp,
      tweet.replies,
      tweet.retweets,
      tweet.likes,
      tweet.engagement_score,
      tweet.type,
      tweet.reference?.id ?? null,
      tweet.reference?.username ?? null,
      tweet.id,
    ],
  });
}

export async function deleteTweet(id: string, listName: string) {
  const db = await initDb(listName);

  await db.execute({
    sql: "DELETE FROM tweets WHERE id = ?",
    args: [id],
  });
}

export async function getPopularTweets(listName: string, days: number = 7) {
  const db = await initDb(listName);

  const usernamesResult = await db.execute(
    `SELECT DISTINCT username FROM tweets WHERE timestamp >= strftime('%s', 'now', '-${days} days')`
  );
  const usernames = usernamesResult.rows.map((row: any) => row.username);
  let results: Tweet[] = [];
  for (const username of usernames) {
    const res = await db.execute(
      `SELECT * FROM tweets WHERE
        username = ? AND
        timestamp >= strftime('%s', 'now', '-${days} days')
        ORDER BY engagement_score DESC
        LIMIT 5
      `,
      [username]
    );
    results.push(...res.rows.map(rowToTweet));
  }

  return results;
}

function rowToTweet(row: any): Tweet {
  const tweet: Tweet = {
    id: row.id,
    text: row.text,
    username: row.username,
    created_at: row.created_at,
    timestamp: row.timestamp,
    replies: row.replies,
    retweets: row.retweets,
    likes: row.likes,
    engagement_score: row.engagement_score,
    type: row.type,
  };
  if (row.reference_id && row.reference_username) {
    tweet.reference = {
      id: row.reference_id,
      username: row.reference_username,
    };
  }
  return tweet;
}
