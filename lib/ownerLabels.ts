import { Owner } from "@/types/subscription"

/** Returns the display label for an owner key, falling back to the key itself. */
export function displayOwner(ownerKey: Owner, labels: Record<string, string>): string {
  return labels[ownerKey] ?? ownerKey
}
