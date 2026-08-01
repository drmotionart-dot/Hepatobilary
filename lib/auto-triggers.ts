// Spec §5 universal rules — shared by the note forms (client) and enforced
// again server-side in POST /api/clinical-notes.
//  - Age > 40  → ECG required (overridable)
//  - Age > 60  → Echo required (overridable)
//  - Smoker    → auto-add Atrovent + Pulmicort to orders
export function ageBasedInvestigations(age: number) {
  return {
    ecgRequired: age > 40,
    echoRequired: age > 60,
  };
}

export function smokerOrders(orders: string[], smoker: boolean): string[] {
  if (!smoker) return orders;
  const seen = new Set(orders.map((o) => o.trim().toLowerCase()));
  const extras = ["Atrovent", "Pulmicort"].filter((m) => !seen.has(m.toLowerCase()));
  return extras.length ? [...orders, ...extras] : orders;
}
