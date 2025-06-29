import { readFile } from "fs/promises";

export async function getUsernames(list: string) {
  const data = await readFile(`lists/${list}.json`, "utf-8");

  return JSON.parse(data);
}
