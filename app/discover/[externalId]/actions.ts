"use server";

import { redirect } from "next/navigation";
import { addItemToList } from "@/lib/collection/actions";

export async function addAndGo(externalId: string) {
  const entryId = await addItemToList(externalId);
  redirect(`/movie/${entryId}`);
}
