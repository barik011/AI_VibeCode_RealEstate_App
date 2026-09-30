const camel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export function fromRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const name = camel(key);
      return [
        name,
        value &&
        [
          'createdAt',
          'updatedAt',
          'dueDate',
          'date',
          'assignedAt',
          'nextFollowUp',
          'closingDate',
          'completedAt',
        ].includes(name)
          ? new Date(value).toISOString()
          : value,
      ];
    }),
  );
}
export function propertyFromRow(row) {
  const p = fromRow(row);
  return {
    ...p,
    price: Number(p.price),
    area: Number(p.area),
    coordinates: p.coordinates || { lat: 25.2048, lng: 55.2708 },
    agent: p.agent || {},
    images: p.images || [],
    amenities: p.amenities || [],
  };
}
export function leadFromRow(row) {
  const l = fromRow(row);
  return {
    ...l,
    customer: {
      name: l.customerName,
      email: l.customerEmail,
      phone: l.customerPhone,
      country: l.customerCountry,
    },
    budget: { min: Number(l.budgetMin), max: Number(l.budgetMax) },
    ...(l.dealValue
      ? {
          deal: {
            propertyId: l.finalPropertyId,
            value: Number(l.dealValue),
            closingDate: l.closingDate,
            notes: l.dealNotes,
          },
        }
      : {}),
  };
}
export const emptySnapshot = () => ({
  properties: [],
  agents: [],
  leads: [],
  tasks: [],
  viewings: [],
  activities: [],
  notes: [],
  notifications: [],
  settings: {},
});
