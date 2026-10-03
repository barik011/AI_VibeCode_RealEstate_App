import { mockDatabase } from '../repositories/mockDatabase.js';
import { authService } from './authService.js';
import { isSupabase } from './supabase/client.js';
import { supabaseCRM } from './supabase/crm.js';
import { agentImpact, validateAgent } from '../features/crm/agentRules.js';
import {
  propertyImpact,
  assertPropertyVersion,
  validatePropertyText,
} from '../features/crm/propertyRules.js';
import {
  canAccessLead,
  canAccessWork,
  isAdmin,
  STAGES,
  PRIORITIES,
  SOURCES,
  TERMINAL,
  LOST_REASONS,
  VIEWING_OUTCOMES,
  label,
  dateKey,
  taskStatus,
} from '../features/crm/constants.js';

const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const required = (value, name) => {
  if (!String(value ?? '').trim()) throw new Error(`${name} is required.`);
  return String(value).trim();
};
const validDate = (value, future = false) => {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    throw new Error('Choose a valid date and time.');
  if (future && new Date(value) <= new Date()) throw new Error('Choose a future date and time.');
  return new Date(value).toISOString();
};
const positive = (value, name) => {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0)
    throw new Error(`${name} must be greater than zero.`);
  return Number(value);
};
const find = (rows, key, name) => {
  const row = rows.find((r) => String(r.id) === String(key));
  if (!row) throw new Error(`${name} was not found.`);
  return row;
};
const assertAdmin = (user) => {
  if (!isAdmin(user)) throw new Error('Administrator access is required.');
};
const assertLead = (user, lead) => {
  if (!canAccessLead(user, lead)) throw new Error('This lead is not assigned to you.');
};
const assertOpen = (lead) => {
  if (TERMINAL.includes(lead.status))
    throw new Error('This lead is closed. Reopen it before scheduling work.');
};

// All workflow rules and their side effects run in one transaction. A future
// backend adapter should preserve this contract with database transactions/RPCs.
export function applyCommand(data, command, payload, user) {
  if (
    command !== 'inquiry' &&
    user?.role === 'AGENT' &&
    !data.agents.some((agent) => agent.id === user.agentId && agent.status === 'ACTIVE')
  )
    throw new Error('Your agent account is inactive. Contact your administrator.');
  const now = new Date().toISOString();
  const propertyEvent = (property, type, message) => {
    (data.propertyEvents ||= []).unshift({
      id: id('PE'),
      propertyId: property.id,
      type,
      message,
      author: user.name,
      createdAt: now,
    });
  };
  const activity = (lead, type, message) => {
    lead.updatedAt = now;
    data.activities.unshift({
      id: id('ACT'),
      leadId: lead.id,
      type,
      message,
      author: user?.name || 'Website visitor',
      createdAt: now,
    });
  };
  const notify = (lead, message, agentId = lead.assignedAgentId) =>
    data.notifications.unshift({
      id: id('NOTICE'),
      leadId: lead.id,
      agentId,
      message,
      createdAt: now,
      readBy: [],
    });
  const stage = (lead, status) => {
    if (lead.status !== status) {
      lead.status = status;
      activity(lead, 'STATUS_CHANGED', `Lead moved to ${label(status)}.`);
    }
  };
  const syncFollowUp = (lead) => {
    lead.nextFollowUp =
      data.tasks
        .filter(
          (t) =>
            t.leadId === lead.id && t.isFollowUp && !['COMPLETED', 'CANCELLED'].includes(t.status),
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate || null;
  };
  const closeWork = (lead) => {
    data.tasks
      .filter((t) => t.leadId === lead.id && !['COMPLETED', 'CANCELLED'].includes(t.status))
      .forEach((t) => {
        t.status = 'CANCELLED';
      });
    data.viewings
      .filter((v) => v.leadId === lead.id && v.status === 'SCHEDULED')
      .forEach((v) => {
        v.status = 'CANCELLED';
      });
    syncFollowUp(lead);
  };
  if (command === 'createLead' || command === 'inquiry') {
    if (command === 'createLead') assertAdmin(user);
    const customer = {
      name: required(payload.name, 'Customer name'),
      email: required(payload.email, 'Email'),
      phone: required(payload.phone, 'Phone'),
      country: required(payload.country, 'Country'),
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
      throw new Error('Enter a valid email address.');
    if (!/^[+0-9\s()-]{7,20}$/.test(customer.phone)) throw new Error('Enter a valid phone number.');
    const property = payload.propertyId
      ? find(data.properties, payload.propertyId, 'Property')
      : null;
    if (command === 'inquiry' && property && property.status !== 'ACTIVE')
      throw new Error('Property is unavailable.');
    const ranges = {
      'Under 1 million': [0, 1000000],
      '1–5 million': [1000000, 5000000],
      '5–15 million': [5000000, 15000000],
      '15 million and above': [15000000, 0],
    };
    const range = ranges[payload.budget] || [0, Number(payload.budgetMax || 0)];
    if (!Number.isFinite(range[1]) || range[1] < 0) throw new Error('Budget cannot be negative.');
    const lead = {
      id: id('LEAD'),
      customer,
      propertyId: property?.id || null,
      purpose: payload.purpose || payload.interest || property?.purpose || 'buy',
      budget: { min: range[0], max: range[1] },
      preferredLocation: property?.location || payload.location || '',
      preferredContact: payload.preferredContact || 'Call',
      source:
        command === 'inquiry'
          ? property
            ? 'Property Detail'
            : 'Contact Form'
          : SOURCES.includes(payload.source)
            ? payload.source
            : 'Other',
      status: 'NEW',
      priority: PRIORITIES.includes(payload.priority) ? payload.priority : 'MEDIUM',
      assignedAgentId: null,
      assignedAt: null,
      createdAt: now,
      updatedAt: now,
      nextFollowUp: null,
    };
    if (command === 'inquiry' && required(payload.message, 'Message').length < 10)
      throw new Error('Your message must contain at least 10 characters.');
    data.leads.unshift(lead);
    activity(lead, 'LEAD_CREATED', `Lead created from ${lead.source}.`);
    if (payload.message?.trim())
      data.notes.unshift({
        id: id('NOTE'),
        leadId: lead.id,
        author: user?.name || customer.name,
        content: payload.message.trim(),
        createdAt: now,
      });
    notify(lead, `New inquiry from ${customer.name}.`);
    return lead;
  }
  if (!user) throw new Error('Sign in to continue.');
  if (command === 'bulkAssign') {
    assertAdmin(user);
    if (!Array.isArray(payload.ids) || !payload.ids.length || payload.ids.length > 100)
      throw new Error('Select between 1 and 100 leads.');
    const ids = [...new Set(payload.ids)];
    const agent = find(data.agents, payload.agentId, 'Agent');
    if (agent.status !== 'ACTIVE') throw new Error('Select an active agent.');
    ids.forEach((key) => assertOpen(find(data.leads, key, 'Lead')));
    // Apply to a copy so even direct callers never observe a partially applied batch.
    const next = structuredClone(data);
    ids.forEach((key) => applyCommand(next, 'assign', { id: key, agentId: agent.id }, user));
    Object.assign(data, next);
    return { count: ids.length };
  }
  if (command === 'deleteAgent') {
    assertAdmin(user);
    const agent = find(data.agents, payload.id, 'Agent');
    if (payload.confirmName !== agent.name)
      throw new Error('Type the agent name to confirm deletion.');
    if (agentImpact(data, agent.id).linked || authService.hasAgentAccount?.(agent.id))
      throw new Error(
        'This agent has linked CRM records or a login account. Reassign open work and deactivate the agent instead.',
      );
    data.agents = data.agents.filter((row) => row.id !== agent.id);
    (data.agentEvents ||= []).unshift({
      id: id('AE'),
      agentId: agent.id,
      type: 'DELETED',
      message: `Deleted agent ${agent.name}.`,
      author: user.name,
      createdAt: now,
    });
    return { id: agent.id };
  }
  if (['deleteProperty', 'setPropertyFeatured', 'archiveProperty'].includes(command)) {
    assertAdmin(user);
    const property = find(data.properties, payload.id, 'Property');
    assertPropertyVersion(property, payload.expectedVersion);
    if (command === 'deleteProperty') {
      if (payload.confirmTitle !== property.title)
        throw new Error('Type the property title to confirm deletion.');
      if (propertyImpact(data, property.id).linked)
        throw new Error(
          'This property has linked leads, deals or viewings. Archive it to preserve CRM history.',
        );
      data.properties = data.properties.filter((row) => row.id !== property.id);
      propertyEvent(property, 'DELETED', `Deleted property ${property.title}.`);
    } else {
      if (command === 'setPropertyFeatured') {
        if (typeof payload.featured !== 'boolean')
          throw new Error('Choose a valid featured value.');
        property.featured = payload.featured;
      } else {
        property.status = 'INACTIVE';
        property.featured = false;
      }
      property.version = (property.version || 1) + 1;
      property.updatedAt = now;
      propertyEvent(
        property,
        command === 'archiveProperty' ? 'ARCHIVED' : 'UPDATED',
        `${command === 'archiveProperty' ? 'Archived' : 'Updated featured selection for'} property ${property.title}.`,
      );
    }
    return { id: property.id };
  }
  if (command === 'saveProperty') {
    assertAdmin(user);
    const existing = payload.id ? find(data.properties, payload.id, 'Property') : null;
    if (existing) assertPropertyVersion(existing, payload.expectedVersion);
    validatePropertyText(payload);
    const title = required(payload.title, 'Title');
    const images = (
      Array.isArray(payload.images) ? payload.images : String(payload.images || '').split('\n')
    )
      .map((v) => v.trim())
      .filter(Boolean);
    if (
      !images.length ||
      images.some((url) => {
        try {
          return !['https:', 'http:'].includes(new URL(url).protocol);
        } catch {
          return true;
        }
      })
    )
      throw new Error('Provide at least one valid http or https image URL.');
    for (const key of ['bedrooms', 'bathrooms'])
      if (!Number.isInteger(Number(payload[key])) || Number(payload[key]) < 0)
        throw new Error(`${label(key)} must be a non-negative whole number.`);
    if (
      !['buy', 'rent', 'off-plan', 'commercial'].includes(payload.purpose) ||
      !['ACTIVE', 'DRAFT', 'SOLD', 'RENTED', 'INACTIVE'].includes(payload.status)
    )
      throw new Error('Choose a valid property purpose and status.');
    const propertyId =
      existing?.id ||
      Math.max(data.propertySequence || 0, ...data.properties.map((p) => Number(p.id))) + 1;
    const result = {
      ...existing,
      id: propertyId,
      version: existing ? (existing.version || 1) + 1 : 1,
      updatedAt: now,
      title,
      slug:
        existing?.slug ||
        `${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${propertyId}`,
      category: required(payload.category, 'Category'),
      purpose: payload.purpose,
      location: required(payload.location, 'Location'),
      locationSlug: required(payload.locationSlug, 'Location reference'),
      price: positive(payload.price, 'Price'),
      bedrooms: Number(payload.bedrooms),
      bathrooms: Number(payload.bathrooms),
      area: positive(payload.area, 'Area'),
      description: required(payload.description, 'Description'),
      amenities: (Array.isArray(payload.amenities)
        ? payload.amenities
        : String(payload.amenities || '').split(',')
      )
        .map((a) => a.trim())
        .filter(Boolean),
      images,
      featured: Boolean(payload.featured),
      status: payload.status,
      city: 'Dubai',
      currency: 'AED',
      areaUnit: 'sq ft',
      offPlan: payload.purpose === 'off-plan',
      createdAt: existing?.createdAt || now.slice(0, 10),
      tenure: existing?.tenure || 'Freehold',
      furnished: existing?.furnished || 'Unfurnished',
      reference: existing?.reference || `DH-${propertyId}`,
      coordinates: existing?.coordinates || { lat: 25.2048, lng: 55.2708 },
      agent: existing?.agent || {
        name: data.agents[0]?.name || 'Dubai House',
        role: 'Property Advisor',
        languages: data.agents[0]?.languages.join(' · ') || '',
        image: data.agents[0]?.avatar || '',
      },
    };
    if (existing) Object.assign(existing, result);
    else {
      data.propertySequence = propertyId;
      data.properties.unshift(result);
    }
    propertyEvent(
      result,
      existing ? 'UPDATED' : 'CREATED',
      `${existing ? 'Updated' : 'Created'} property ${result.title} (${result.status}).`,
    );
    return result;
  }
  if (command === 'saveSettings') {
    assertAdmin(user);
    data.settings = {
      company: required(payload.company, 'Company'),
      email: required(payload.email, 'Email'),
      phone: required(payload.phone, 'Phone'),
      defaultView: payload.defaultView === 'kanban' ? 'kanban' : 'table',
    };
    return data.settings;
  }
  if (command === 'saveAgent' || command === 'createAgent') {
    const agent = command === 'saveAgent' ? find(data.agents, payload.id, 'Agent') : null;
    if (!agent) assertAdmin(user);
    if (agent && !isAdmin(user) && agent.id !== user.agentId) throw new Error('Access denied.');
    const fields = validateAgent(payload, agent, isAdmin(user));
    if (data.agents.some((row) => row.id !== agent?.id && row.email.toLowerCase() === fields.email))
      throw new Error('An agent with this email already exists.');
    const impact = agent && agentImpact(data, agent.id);
    if (
      fields.status === 'INACTIVE' &&
      impact &&
      (impact.openLeads || impact.openTasks || impact.scheduledViewings)
    )
      throw new Error(
        'Reassign all open leads, tasks and scheduled viewings before deactivating this agent.',
      );
    const result = agent || { id: id('agent'), avatar: '' };
    Object.assign(result, fields);
    if (!agent) data.agents.unshift(result);
    (data.agentEvents ||= []).unshift({
      id: id('AE'),
      agentId: result.id,
      type: agent ? 'UPDATED' : 'CREATED',
      message: `${agent ? 'Updated' : 'Created'} agent ${result.name} (${result.status}).`,
      author: user.name,
      createdAt: now,
    });
    return result;
  }
  if (command === 'readNotifications') {
    for (const task of data.tasks.filter(
      (t) =>
        canAccessWork(user, t) &&
        (taskStatus(t) === 'OVERDUE' ||
          (dateKey(t.dueDate) === dateKey() && !['COMPLETED', 'CANCELLED'].includes(t.status))),
    )) {
      const noticeId = `due-${task.id}-${task.dueDate}`;
      if (!data.notifications.some((n) => n.id === noticeId))
        data.notifications.push({
          id: noticeId,
          leadId: task.leadId,
          agentId: task.agentId,
          message: `${taskStatus(task) === 'OVERDUE' ? 'Overdue' : 'Due today'}: ${task.title}`,
          createdAt: task.dueDate,
          readBy: [],
        });
    }
    data.notifications
      .filter(
        (n) =>
          (isAdmin(user) || n.agentId === user.agentId) && (!payload.id || n.id === payload.id),
      )
      .forEach((n) => {
        if (!n.readBy.includes(user.id)) n.readBy.push(user.id);
      });
    return;
  }
  const work =
    command === 'updateTask'
      ? find(data.tasks, payload.id, 'Task')
      : command === 'updateViewing'
        ? find(data.viewings, payload.id, 'Viewing')
        : null;
  if (work && !canAccessWork(user, work)) throw new Error('This work is not assigned to you.');
  const lead = find(data.leads, work?.leadId || payload.leadId || payload.id, 'Lead');
  assertLead(user, lead);
  switch (command) {
    case 'assign': {
      assertAdmin(user);
      assertOpen(lead);
      const agent = find(data.agents, payload.agentId, 'Agent');
      if (agent.status !== 'ACTIVE') throw new Error('Select an active agent.');
      const previous = lead.assignedAgentId;
      lead.assignedAgentId = agent.id;
      lead.assignedAt = now;
      // Reassignment transfers outstanding work so the old agent loses access consistently.
      data.tasks
        .filter((t) => t.leadId === lead.id && !['COMPLETED', 'CANCELLED'].includes(t.status))
        .forEach((t) => {
          t.agentId = agent.id;
        });
      data.viewings
        .filter((v) => v.leadId === lead.id && v.status === 'SCHEDULED')
        .forEach((v) => {
          v.agentId = agent.id;
        });
      if (lead.status === 'NEW') stage(lead, 'ASSIGNED');
      activity(lead, 'AGENT_ASSIGNED', `${previous ? 'Reassigned' : 'Assigned'} to ${agent.name}.`);
      notify(lead, `${lead.customer.name} assigned to ${agent.name}.`);
      return lead;
    }
    case 'status': {
      if (
        payload.status === 'FOLLOW_UP' &&
        data.agents.some(
          (agent) => agent.id === lead.assignedAgentId && agent.status === 'INACTIVE',
        )
      )
        throw new Error('Reactivate the responsible agent before reopening this lead.');
      if (
        !STAGES.includes(payload.status) ||
        ['WON', 'LOST', 'VIEWING_SCHEDULED', 'VIEWING_COMPLETED'].includes(payload.status)
      )
        throw new Error('Use the dedicated viewing or outcome action for this stage.');
      if (TERMINAL.includes(lead.status) && payload.status !== 'FOLLOW_UP')
        throw new Error('Reopen closed leads in Follow Up.');
      if (payload.status !== 'NEW' && !lead.assignedAgentId)
        throw new Error('Assign an agent first.');
      if (payload.status === 'NEW' && lead.assignedAgentId)
        throw new Error('Assigned leads cannot return to New.');
      if (TERMINAL.includes(lead.status)) {
        delete lead.deal;
        delete lead.lostReason;
        delete lead.lostNotes;
      }
      stage(lead, payload.status);
      return lead;
    }
    case 'priority':
      if (!PRIORITIES.includes(payload.priority)) throw new Error('Choose a valid priority.');
      lead.priority = payload.priority;
      activity(lead, 'PRIORITY_CHANGED', `Priority changed to ${label(payload.priority)}.`);
      return lead;
    case 'note': {
      const content = required(payload.content, 'Note');
      data.notes.unshift({
        id: id('NOTE'),
        leadId: lead.id,
        author: user.name,
        createdAt: now,
        content,
      });
      activity(lead, 'NOTE_ADDED', 'A note was added.');
      return lead;
    }
    case 'communication': {
      if (!['Call', 'Email', 'WhatsApp'].includes(payload.type))
        throw new Error('Choose a communication type.');
      activity(
        lead,
        `${payload.type.toUpperCase()}_LOGGED`,
        `${payload.type} logged: ${required(payload.content, 'Communication notes')}`,
      );
      if (['NEW', 'ASSIGNED'].includes(lead.status)) {
        if (!lead.assignedAgentId) throw new Error('Assign an agent first.');
        stage(lead, 'CONTACTED');
      }
      return lead;
    }
    case 'createTask': {
      assertOpen(lead);
      if (!lead.assignedAgentId) throw new Error('Assign an agent before scheduling work.');
      const task = {
        id: id('TASK'),
        title: required(payload.title, 'Title'),
        leadId: lead.id,
        agentId: lead.assignedAgentId,
        type: payload.type || 'Call',
        dueDate: validDate(payload.dueDate, true),
        priority: payload.priority || lead.priority,
        status: 'PENDING',
        notes: payload.notes || '',
        isFollowUp: Boolean(payload.isFollowUp),
      };
      data.tasks.unshift(task);
      syncFollowUp(lead);
      activity(
        lead,
        task.isFollowUp ? 'FOLLOW_UP_CREATED' : 'TASK_CREATED',
        `${task.title} scheduled for ${task.dueDate}.`,
      );
      if (task.isFollowUp && !['VIEWING_SCHEDULED', 'NEGOTIATION'].includes(lead.status))
        stage(lead, 'FOLLOW_UP');
      notify(
        lead,
        `${task.isFollowUp ? 'Follow-up' : 'Task'} scheduled for ${lead.customer.name}.`,
      );
      return task;
    }
    case 'updateTask': {
      if (['COMPLETED', 'CANCELLED'].includes(work.status))
        throw new Error('This task is already closed.');
      if (payload.dueDate) work.dueDate = validDate(payload.dueDate, true);
      if (payload.status) {
        if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(payload.status))
          throw new Error('Invalid task status.');
        work.status = payload.status;
      }
      syncFollowUp(lead);
      activity(
        lead,
        'TASK_UPDATED',
        `${work.title}: ${payload.dueDate ? 'rescheduled to ' + work.dueDate : label(work.status)}.`,
      );
      return work;
    }
    case 'createViewing': {
      assertOpen(lead);
      if (!lead.assignedAgentId) throw new Error('Assign an agent before scheduling a viewing.');
      const property = find(data.properties, payload.propertyId || lead.propertyId, 'Property');
      const date = validDate(payload.date, true);
      if (
        data.viewings.some(
          (v) =>
            v.status === 'SCHEDULED' &&
            v.agentId === lead.assignedAgentId &&
            Math.abs(new Date(v.date) - new Date(date)) < 3600000,
        )
      )
        throw new Error('This agent has a viewing within one hour of this time.');
      const viewing = {
        id: id('VIEW'),
        leadId: lead.id,
        propertyId: property.id,
        agentId: lead.assignedAgentId,
        date,
        meetingLocation: required(payload.meetingLocation, 'Meeting location'),
        notes: payload.notes || '',
        status: 'SCHEDULED',
        outcome: null,
      };
      data.viewings.unshift(viewing);
      stage(lead, 'VIEWING_SCHEDULED');
      activity(lead, 'VIEWING_CREATED', `Viewing at ${property.title} scheduled for ${date}.`);
      notify(lead, `Viewing scheduled for ${lead.customer.name}.`);
      return viewing;
    }
    case 'updateViewing': {
      if (work.status !== 'SCHEDULED') throw new Error('This viewing is already closed.');
      if (payload.action === 'reschedule') {
        const date = validDate(payload.date, true);
        if (
          data.viewings.some(
            (v) =>
              v.id !== work.id &&
              v.status === 'SCHEDULED' &&
              v.agentId === work.agentId &&
              Math.abs(new Date(v.date) - new Date(date)) < 3600000,
          )
        )
          throw new Error('This agent has another viewing within one hour.');
        work.date = date;
        activity(lead, 'VIEWING_RESCHEDULED', `Viewing rescheduled to ${date}.`);
      } else if (payload.action === 'cancel') {
        work.status = 'CANCELLED';
        activity(lead, 'VIEWING_CANCELLED', 'Viewing cancelled.');
        if (
          !data.viewings.some((v) => v.leadId === lead.id && v.status === 'SCHEDULED') &&
          lead.status === 'VIEWING_SCHEDULED'
        )
          stage(lead, 'FOLLOW_UP');
      } else {
        if (new Date(work.date) > new Date())
          throw new Error('A viewing can only be completed after its scheduled time.');
        if (!VIEWING_OUTCOMES.includes(payload.outcome))
          throw new Error('Choose a viewing outcome.');
        work.status = 'COMPLETED';
        work.outcome = payload.outcome;
        work.outcomeNotes = required(payload.notes, 'Outcome notes');
        work.completedAt = now;
        activity(
          lead,
          'VIEWING_COMPLETED',
          `Viewing completed: ${payload.outcome}. ${work.outcomeNotes}`,
        );
        stage(lead, 'VIEWING_COMPLETED');
        if (['Interested', 'Very Interested'].includes(payload.outcome)) stage(lead, 'NEGOTIATION');
        else stage(lead, 'FOLLOW_UP');
      }
      return work;
    }
    case 'won': {
      assertOpen(lead);
      if (!payload.confirmed) throw new Error('Confirm the final deal before closing.');
      if (!lead.assignedAgentId) throw new Error('Assign an agent first.');
      const property = find(data.properties, payload.propertyId, 'Final property');
      const closingDate = validDate(payload.closingDate);
      if (new Date(closingDate) > new Date())
        throw new Error('Closing date cannot be in the future.');
      lead.deal = {
        propertyId: property.id,
        value: positive(payload.value, 'Deal value'),
        closingDate,
        notes: payload.notes || '',
      };
      stage(lead, 'WON');
      closeWork(lead);
      activity(lead, 'WON', 'Deal marked as won. Outstanding work cancelled.');
      notify(lead, `Deal won: ${lead.customer.name}.`);
      return lead;
    }
    case 'lost': {
      assertOpen(lead);
      if (!LOST_REASONS.includes(payload.reason)) throw new Error('Select a lost reason.');
      if (payload.reason === 'Other') required(payload.notes, 'Lost notes');
      lead.lostReason = payload.reason;
      lead.lostNotes = payload.notes || '';
      stage(lead, 'LOST');
      closeWork(lead);
      activity(lead, 'LOST', `Lead marked as lost: ${payload.reason}. Outstanding work cancelled.`);
      return lead;
    }
    default:
      throw new Error('Unknown CRM action.');
  }
}

const mockCRMService = {
  async execute(command, payload = {}) {
    const data = mockDatabase.read();
    const result = applyCommand(data, command, payload, authService.getSession());
    mockDatabase.commit(data);
    return result;
  },
  async getSnapshot() {
    return mockDatabase.read();
  },
  subscribe(listener) {
    return mockDatabase.subscribe(listener);
  },
  async reset() {
    assertAdmin(authService.getSession());
    return mockDatabase.reset();
  },
};
export const crmService = isSupabase ? supabaseCRM : mockCRMService;
