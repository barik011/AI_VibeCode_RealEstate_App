export function propertyImpact(data, propertyId) {
  const matches = (id) => id != null && String(id) === String(propertyId);
  const leads = data.leads.filter(
    (lead) => matches(lead.propertyId) || matches(lead.deal?.propertyId),
  );
  const viewings = data.viewings.filter((viewing) => matches(viewing.propertyId));
  return { leads: leads.length, viewings: viewings.length, linked: leads.length + viewings.length };
}

export function assertPropertyVersion(property, expectedVersion) {
  if (Number(expectedVersion) !== (property.version || 1)) {
    throw new Error(
      'This property has changed since you opened it. Close this dialog, refresh the workspace and review the latest record before trying again.',
    );
  }
}

export function validatePropertyText(payload) {
  for (const [key, max] of Object.entries({
    title: 200,
    category: 100,
    location: 200,
    locationSlug: 200,
    description: 10000,
  })) {
    if (String(payload[key] ?? '').trim().length > max) {
      throw new Error(`${key} must be ${max} characters or fewer.`);
    }
  }
  for (const key of ['images', 'amenities']) {
    const values = Array.isArray(payload[key])
      ? payload[key]
      : String(payload[key] || '').split(key === 'images' ? '\n' : ',');
    if (values.length > 50 || values.some((value) => String(value).length > 2000)) {
      throw new Error(`${key} accepts up to 50 entries of 2000 characters each.`);
    }
  }
}
