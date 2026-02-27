export type Currency = "EUR" | "USD" | "RUB"
export type BillingCycle = "monthly" | "yearly"
export type Owner = "me" | "wife"

export type Subscription = {
  id: string
  name: string
  amount: number
  currency: Currency
  billingCycle: BillingCycle
  nextChargeDate: string // ISO: YYYY-MM-DD
  category: string
  card: string
  owner: Owner
}
