import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectWorkspace } from '../store';
import {
  CONTACT_TYPES,
  LOST_REASONS,
  PRIORITIES,
  SOURCES,
  STAGES,
  TERMINAL,
  dateKey,
} from '../constants';
import { Field, FormDialog, useCommand } from './UI';
export const leadActionTitles = {
  create: 'Add lead',
  assign: 'Assign agent',
  status: 'Change status',
  note: 'Add note',
  communication: 'Log communication',
  followUp: 'Schedule follow-up',
  task: 'Create task',
  viewing: 'Schedule viewing',
  won: 'Mark as Won',
  lost: 'Mark as Lost',
  priority: 'Change priority',
};
export function LeadActionDialog({ action, lead, onClose, onCreated }) {
  const data = useSelector(selectWorkspace);
  const run = useCommand();
  const [leadId, setLeadId] = useState(lead?.id || '');
  const selected = lead || data.leads.find((l) => l.id === leadId);
  const properties = data.properties.map((p) => [p.id, p.title]);
  const needsLead = !lead && !['create'].includes(action);
  const submit = async (fields) => {
    const id = selected?.id;
    let result;
    const actions = {
      create: ['createLead', fields, 'Lead created.'],
      assign: ['assign', { id, agentId: fields.agentId }, 'Lead assigned successfully.'],
      status: ['status', { id, status: fields.status }, 'Lead stage updated.'],
      priority: ['priority', { id, priority: fields.priority }, 'Priority updated.'],
      note: ['note', { id, content: fields.content }, 'Note added.'],
      communication: [
        'communication',
        { id, type: fields.type, content: fields.content },
        'Communication logged. No message was sent.',
      ],
      followUp: ['createTask', { ...fields, leadId: id, isFollowUp: true }, 'Follow-up scheduled.'],
      task: ['createTask', { ...fields, leadId: id }, 'Task created.'],
      viewing: ['createViewing', { ...fields, leadId: id }, 'Viewing created.'],
      won: ['won', { ...fields, id, confirmed: fields.confirmed === 'on' }, 'Deal marked as Won.'],
      lost: ['lost', { ...fields, id }, 'Lead marked as Lost.'],
    };
    result = await run(...actions[action]);
    if (action === 'create') onCreated?.(result);
  };
  return (
    <FormDialog
      title={leadActionTitles[action]}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={
        action === 'won' ? 'Confirm won deal' : action === 'lost' ? 'Confirm lost lead' : 'Save'
      }
      description={
        action === 'communication'
          ? 'Record a past conversation. This action does not send calls, emails or WhatsApp messages.'
          : undefined
      }
    >
      {needsLead && (
        <Field
          label="Lead"
          name="leadId"
          required
          options={[
            ['', 'Select lead'],
            ...data.leads
              .filter((l) => !TERMINAL.includes(l.status))
              .map((l) => [l.id, l.customer.name]),
          ]}
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        />
      )}
      {action === 'create' && (
        <>
          <Field label="Customer name" name="name" required minLength={2} />
          <Field label="Email" name="email" type="email" required />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            required
            pattern={String.raw`[+0-9\s\(\)\-]{7,20}`}
          />
          <Field label="Country" name="country" required defaultValue="UAE" />
          <Field
            label="Property"
            name="propertyId"
            options={[['', 'General inquiry'], ...properties]}
          />
          <Field label="Source" name="source" options={SOURCES} />
          <Field label="Budget maximum (AED)" name="budgetMax" type="number" min="0" />
          <Field label="Priority" name="priority" options={PRIORITIES} defaultValue="MEDIUM" />
          <Field label="Message" name="message" type="textarea" />
        </>
      )}
      {action === 'assign' && (
        <Field
          label="Agent"
          name="agentId"
          required
          defaultValue={selected?.assignedAgentId || ''}
          options={[
            ['', 'Select agent'],
            ...data.agents.filter((a) => a.status === 'ACTIVE').map((a) => [a.id, a.name]),
          ]}
        />
      )}
      {action === 'status' && (
        <Field
          label="Stage"
          name="status"
          options={STAGES.filter(
            (s) => !['WON', 'LOST', 'VIEWING_SCHEDULED', 'VIEWING_COMPLETED'].includes(s),
          ).filter((s) => (TERMINAL.includes(selected?.status) ? s === 'FOLLOW_UP' : s !== 'NEW'))}
          defaultValue={selected?.status === 'NEW' ? 'CONTACTED' : selected?.status}
        />
      )}
      {action === 'priority' && (
        <Field
          label="Priority"
          name="priority"
          options={PRIORITIES}
          defaultValue={selected?.priority}
        />
      )}
      {['note', 'communication'].includes(action) && (
        <>
          {action === 'communication' && (
            <Field label="Channel" name="type" options={['Call', 'Email', 'WhatsApp']} />
          )}
          <Field
            label={action === 'note' ? 'Note' : 'Conversation notes'}
            name="content"
            type="textarea"
            required
          />
        </>
      )}
      {['followUp', 'task'].includes(action) && (
        <>
          <Field
            label="Title"
            name="title"
            required
            defaultValue={action === 'followUp' ? 'Customer follow-up' : ''}
          />
          <Field label="Date and time" name="dueDate" type="datetime-local" required />
          <Field label="Type" name="type" options={CONTACT_TYPES} />
          <Field
            label="Priority"
            name="priority"
            options={PRIORITIES}
            defaultValue={selected?.priority || 'MEDIUM'}
          />
          <Field label="Notes" name="notes" type="textarea" />
          <p className="crm-field-help">Assigned automatically to the lead’s agent.</p>
        </>
      )}
      {action === 'viewing' && (
        <>
          <Field
            key={selected?.id}
            label="Property"
            name="propertyId"
            required
            options={[['', 'Select property'], ...properties]}
            defaultValue={selected?.propertyId || ''}
          />
          <Field label="Date and time" name="date" type="datetime-local" required />
          <Field label="Meeting location" name="meetingLocation" required />
          <Field label="Notes" name="notes" type="textarea" />
          <p className="crm-field-help">
            Customer: {selected?.customer.name || 'Select a lead'}
            <br />
            Agent:{' '}
            {data.agents.find((a) => a.id === selected?.assignedAgentId)?.name ||
              'Assign an agent before scheduling.'}
          </p>
        </>
      )}
      {action === 'won' && (
        <>
          <Field
            label="Final property"
            name="propertyId"
            required
            options={properties}
            defaultValue={selected?.propertyId}
          />
          <Field
            label="Final deal value (AED)"
            name="value"
            type="number"
            min="1"
            step="0.01"
            required
          />
          <Field
            label="Closing date"
            name="closingDate"
            type="date"
            required
            max={dateKey()}
            defaultValue={dateKey()}
          />
          <Field label="Notes" name="notes" type="textarea" />
          <label className="crm-check crm-full">
            <input name="confirmed" type="checkbox" required /> I confirm the deal is won.
            Outstanding tasks and viewings will be cancelled.
          </label>
        </>
      )}
      {action === 'lost' && (
        <>
          <Field
            label="Lost reason"
            name="reason"
            required
            options={[['', 'Select a reason'], ...LOST_REASONS]}
          />
          <Field label="Lost notes (required for Other)" name="notes" type="textarea" />
          <p className="crm-field-help">
            Closing this lead cancels its outstanding tasks and viewings.
          </p>
        </>
      )}
    </FormDialog>
  );
}
