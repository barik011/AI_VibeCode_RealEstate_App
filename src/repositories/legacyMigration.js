// Preserve stable IDs so repeating a browser import never duplicates an inquiry.
export function mergeLegacyInquiries(snapshot, inquiries, properties) {
  const data = structuredClone(snapshot);
  if (!Array.isArray(inquiries)) return data;
  inquiries.forEach((inquiry, index) => {
    if (!inquiry?.name || !inquiry.email || !inquiry.phone) return;
    const createdAt = Number.isFinite(new Date(inquiry.createdAt).getTime())
      ? new Date(inquiry.createdAt).toISOString()
      : '2026-01-01T00:00:00.000Z';
    const id = inquiry.leadId || `LEGACY-${new Date(createdAt).getTime()}-${index}`;
    if (data.leads.some((lead) => lead.id === id)) return;
    const property = properties.find((p) => p.slug === inquiry.property);
    const budgets = {
      'Under 1 million': [0, 1000000],
      '1\u20135 million': [1000000, 5000000],
      '5\u201315 million': [5000000, 15000000],
      '15 million and above': [15000000, 0],
    };
    const [min, max] = budgets[inquiry.budget] || [0, 0];
    data.leads.push({
      id,
      customer: {
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        country: inquiry.country || 'Not specified',
      },
      propertyId: property?.id || null,
      source: property ? 'Property Detail' : 'Contact Form',
      purpose: inquiry.interest || 'buy',
      budget: { min, max },
      preferredLocation: inquiry.location || property?.location || '',
      preferredContact: inquiry.preferredContact || 'Call',
      status: 'NEW',
      priority: 'MEDIUM',
      assignedAgentId: null,
      assignedAt: null,
      nextFollowUp: null,
      createdAt,
      updatedAt: createdAt,
    });
    data.activities.push({
      id: `${id}-CREATED`,
      leadId: id,
      type: 'LEAD_CREATED',
      message: 'Imported from a legacy website inquiry.',
      author: 'Website visitor',
      createdAt,
    });
    if (inquiry.message)
      data.notes.push({
        id: `${id}-NOTE`,
        leadId: id,
        content: inquiry.message,
        author: inquiry.name,
        createdAt,
      });
  });
  return data;
}

export function prepareLocalImport(snapshot, inquiries, newsletter, catalogProperties) {
  const hasSnapshot = snapshot && Array.isArray(snapshot.leads);
  const data = hasSnapshot ? structuredClone(snapshot) : {};
  for (const key of [
    'leads',
    'properties',
    'agents',
    'tasks',
    'viewings',
    'notes',
    'activities',
    'notifications',
  ]) {
    if (!Array.isArray(data[key])) data[key] = [];
  }
  const combined = mergeLegacyInquiries(data, inquiries, [
    ...data.properties,
    ...catalogProperties,
  ]);
  combined.newsletter =
    typeof newsletter === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletter.trim())
      ? [newsletter.trim().toLowerCase()]
      : [];
  return hasSnapshot || combined.leads.length || combined.newsletter.length ? combined : null;
}
