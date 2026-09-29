import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { selectUser, selectWorkspace } from '../store';
import { dateKey, dateTime, isAdmin, taskStatus, VIEWING_OUTCOMES } from '../constants';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  FormDialog,
  PageHeading,
  Panel,
  RecordLink,
  useCommand,
} from '../components/UI';
import { LeadActionDialog } from '../components/LeadActions';

function WorkDialog({ mode, record, viewing, onClose }) {
  const run = useCommand();
  const title =
    mode === 'reschedule'
      ? `Reschedule ${viewing ? 'viewing' : 'task'}`
      : mode === 'cancel'
        ? `Cancel ${viewing ? 'viewing' : 'task'}`
        : 'Complete viewing';
  return (
    <FormDialog
      title={title}
      onClose={onClose}
      submitLabel={mode === 'cancel' ? 'Confirm cancellation' : 'Save'}
      onSubmit={(fields) =>
        run(
          viewing ? 'updateViewing' : 'updateTask',
          {
            id: record.id,
            ...fields,
            ...(viewing
              ? { action: mode }
              : mode === 'cancel'
                ? { status: 'CANCELLED' }
                : { status: 'PENDING' }),
          },
          mode === 'complete' ? 'Viewing completed. Lead stage updated.' : 'Schedule updated.',
        )
      }
    >
      {mode === 'reschedule' && (
        <Field
          label="New date and time"
          name={viewing ? 'date' : 'dueDate'}
          type="datetime-local"
          required
        />
      )}
      {mode === 'cancel' && (
        <p>
          Cancel this {viewing ? 'viewing' : 'task'}? The change will be recorded in the lead’s
          timeline.
        </p>
      )}
      {mode === 'complete' && (
        <>
          <Field label="Outcome" name="outcome" options={VIEWING_OUTCOMES} required />
          <Field label="Outcome notes" name="notes" type="textarea" required />
          <p className="crm-field-help">
            Interested customers move to Negotiation. Other outcomes move to Follow Up. Use the
            lead’s Mark as Lost action if the customer explicitly declines.
          </p>
        </>
      )}
    </FormDialog>
  );
}
export function WorkPage({ viewing = false }) {
  const data = useSelector(selectWorkspace);
  const user = useSelector(selectUser);
  const base = isAdmin(user) ? '/admin' : '/agent';
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [agent, setAgent] = useState('');
  const [dialog, setDialog] = useState(null);
  const [create, setCreate] = useState(false);
  const [error, setError] = useState('');
  const run = useCommand();
  const tabs = viewing
    ? ['All', 'Scheduled', 'Completed', 'Cancelled']
    : ['All', 'Today', 'Upcoming', 'Overdue', 'Completed', 'Cancelled'];
  const rows = (viewing ? data.viewings : data.tasks)
    .filter((row) => {
      const customer = data.leads.find((l) => l.id === row.leadId)?.customer.name || '';
      const status = viewing ? row.status : taskStatus(row);
      const date = viewing ? row.date : row.dueDate;
      const tabMatches =
        tab === 'All' ||
        (viewing
          ? status === tab.toUpperCase()
          : tab === 'Today'
            ? dateKey(date) === dateKey() && !['COMPLETED', 'CANCELLED'].includes(status)
            : tab === 'Upcoming'
              ? dateKey(date) > dateKey() && !['COMPLETED', 'CANCELLED'].includes(status)
              : status === tab.toUpperCase());
      return (
        tabMatches &&
        (!agent || row.agentId === agent) &&
        `${customer} ${row.title || row.meetingLocation}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!params.get('record') || params.get('record') === row.id)
      );
    })
    .sort((a, b) => (a.date || a.dueDate).localeCompare(b.date || b.dueDate));
  const updateTask = async (record, status) => {
    setError('');
    try {
      await run('updateTask', { id: record.id, status }, 'Task updated.');
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <PageHeading
        title={viewing ? 'Property viewings' : 'Tasks & follow-ups'}
        subtitle={
          viewing
            ? 'Turn a first impression into the next conversation.'
            : 'A clear next step for every customer.'
        }
      >
        <Button onClick={() => setCreate(true)}>
          {viewing ? 'Schedule viewing' : 'Create task'}
        </Button>
      </PageHeading>
      <Panel>
        <div className="crm-work-filters">
          <Field
            label={viewing ? 'Search viewings' : 'Search tasks'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Customer or title"
          />
          {isAdmin(user) && (
            <Field
              label="Agent"
              options={[['', 'All agents'], ...data.agents.map((a) => [a.id, a.name])]}
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
          )}
        </div>
        <div className="crm-tabs" role="group" aria-label="Work filters">
          {tabs.map((t) => (
            <button
              key={t}
              className={t === tab ? 'active' : ''}
              aria-pressed={t === tab}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {params.get('record') && (
          <Button secondary onClick={() => setParams({})}>
            Show all records
          </Button>
        )}
      </Panel>
      {error && (
        <p className="crm-error" role="alert">
          {error}
        </p>
      )}
      <div className="crm-work-grid">
        {rows.map((row) => {
          const lead = data.leads.find((l) => l.id === row.leadId);
          const closed = viewing
            ? row.status !== 'SCHEDULED'
            : ['COMPLETED', 'CANCELLED'].includes(row.status);
          return (
            <article className="crm-panel crm-work-card" key={row.id}>
              <div className="crm-between">
                <Badge value={viewing ? row.status : taskStatus(row)} />
                {!viewing && <Badge value={row.priority} />}
              </div>
              <h2>
                {viewing ? data.properties.find((p) => p.id === row.propertyId)?.title : row.title}
              </h2>
              <RecordLink to={`${base}/leads/${row.leadId}`}>{lead?.customer.name}</RecordLink>
              <p className="crm-work-date">{dateTime(viewing ? row.date : row.dueDate)}</p>
              <p>
                {viewing
                  ? row.meetingLocation
                  : `${row.type}${row.isFollowUp ? ' · Follow-up' : ''}`}
              </p>
              <p className="crm-muted">
                {data.agents.find((a) => a.id === row.agentId)?.name || 'Assigned agent'}
              </p>
              {row.notes && <p>{row.notes}</p>}
              {row.outcome && (
                <p>
                  <strong>{row.outcome}</strong>
                  <br />
                  {row.outcomeNotes}
                </p>
              )}
              {!closed && (
                <div className="crm-actions">
                  {viewing ? (
                    <Button
                      disabled={new Date(row.date) > new Date()}
                      title={
                        new Date(row.date) > new Date()
                          ? 'Available after the scheduled viewing time'
                          : 'Record viewing outcome'
                      }
                      onClick={() => setDialog({ mode: 'complete', record: row })}
                    >
                      Complete viewing
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => updateTask(row, 'COMPLETED')}>Complete</Button>
                      {row.status !== 'IN_PROGRESS' && (
                        <Button secondary onClick={() => updateTask(row, 'IN_PROGRESS')}>
                          Start task
                        </Button>
                      )}
                    </>
                  )}
                  <Button secondary onClick={() => setDialog({ mode: 'reschedule', record: row })}>
                    Reschedule
                  </Button>
                  <Button
                    secondary
                    danger
                    onClick={() => setDialog({ mode: 'cancel', record: row })}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <EmptyState
          title="No matching work"
          text="Choose another filter or schedule a new activity."
        />
      )}
      {dialog && <WorkDialog {...dialog} viewing={viewing} onClose={() => setDialog(null)} />}{' '}
      {create && (
        <LeadActionDialog action={viewing ? 'viewing' : 'task'} onClose={() => setCreate(false)} />
      )}
    </>
  );
}
export const Tasks = () => <WorkPage />;
export const Viewings = () => <WorkPage viewing />;
export function Calendar() {
  const data = useSelector(selectWorkspace);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const first = new Date(month);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const events = [
    ...data.tasks
      .filter((t) => t.status !== 'CANCELLED')
      .map((t) => ({
        id: t.id,
        date: t.dueDate,
        title: t.title,
        type: t.isFollowUp ? 'follow-up' : 'task',
        to: `/agent/tasks?record=${t.id}`,
      })),
    ...data.viewings
      .filter((v) => v.status !== 'CANCELLED')
      .map((v) => ({
        id: v.id,
        date: v.date,
        title: `Viewing · ${data.leads.find((l) => l.id === v.leadId)?.customer.name}`,
        type: 'viewing',
        to: `/agent/viewings?record=${v.id}`,
      })),
  ];
  return (
    <>
      <PageHeading
        title="My calendar"
        subtitle="Your follow-ups, tasks and property viewings in one place."
      />
      <Panel>
        <div className="crm-calendar-heading">
          <h2>
            {new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(month)}
          </h2>
          <div className="crm-actions">
            <Button
              secondary
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              Previous month
            </Button>
            <Button
              secondary
              onClick={() => {
                const d = new Date();
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
            >
              Today
            </Button>
            <Button
              secondary
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              Next month
            </Button>
          </div>
        </div>
        <p className="crm-calendar-legend">
          <span className="viewing">Viewing</span>
          <span className="follow-up">Follow-up</span>
          <span className="task">Task</span>
        </p>
        <div className="crm-calendar-scroll">
          <div className="crm-calendar">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <strong key={day}>{day}</strong>
            ))}
            {Array.from({ length: 42 }, (_, i) => {
              const day = new Date(start);
              day.setDate(start.getDate() + i);
              const key = dateKey(day);
              return (
                <div
                  className={`crm-calendar-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === dateKey() ? 'today' : ''}`}
                  key={key}
                >
                  <time dateTime={key}>{day.getDate()}</time>
                  {events
                    .filter((e) => dateKey(e.date) === key)
                    .map((e) => (
                      <Link className={e.type} key={e.id} to={e.to}>
                        <small>
                          {new Date(e.date).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          · {e.type}
                        </small>
                        {e.title}
                      </Link>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    </>
  );
}
