import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Phone,
  Mail,
  MapPin,
  Download,
  UserRoundCheck,
} from 'lucide-react';
import { downloadCsv, leadExportRows, followUpState } from '../reporting';
import { useCRMClock } from '../useCRMClock';
import { selectUser, selectWorkspace } from '../store';
import {
  STAGES,
  SOURCES,
  PRIORITIES,
  TERMINAL,
  isAdmin,
  label,
  money,
  dateTime,
} from '../constants';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  FormDialog,
  useCommand,
  PageHeading,
  Pagination,
  Panel,
  RecordLink,
  Timeline,
} from '../components/UI';
import { LeadActionDialog } from '../components/LeadActions';
import { Photo } from '../../../components/ui';

export function LeadPipeline({ leads, base, onStage }) {
  return (
    <div className="crm-kanban" aria-label="Lead pipeline">
      {STAGES.map((stage) => {
        const rows = leads.filter((l) => l.status === stage);
        return (
          <section key={stage} className="crm-kanban-column">
            <header>
              <Badge value={stage} />
              <span>{rows.length}</span>
            </header>
            {rows.map((lead) => (
              <article className="crm-lead-card" key={lead.id}>
                <RecordLink to={`${base}/leads/${lead.id}`}>{lead.customer.name}</RecordLink>
                <small>{lead.source}</small>
                <strong>{money(lead.budget.max)}</strong>
                <div>
                  <Badge value={lead.priority} />
                  {onStage && (
                    <button
                      onClick={() => onStage(lead)}
                      aria-label={`Change stage for ${lead.customer.name}`}
                    >
                      Change stage
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!rows.length && <p className="crm-kanban-empty">No leads</p>}
          </section>
        );
      })}
    </div>
  );
}
export function Leads() {
  const data = useSelector(selectWorkspace);
  const user = useSelector(selectUser);
  const admin = isAdmin(user);
  const base = admin ? '/admin' : '/agent';
  const navigate = useNavigate();
  const [view, setView] = useState(data.settings.defaultView || 'table');
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ agent: params.get('agent') || '' }));
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulk, setBulk] = useState(false);
  const run = useCommand();
  const now = useCRMClock();
  const update = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
    setSelected([]);
  };
  const filtered = useMemo(
    () =>
      data.leads
        .filter(
          (l) =>
            (!filters.q ||
              `${l.id} ${Object.values(l.customer).join(' ')} ${data.properties.find((p) => p.id === l.propertyId)?.title || ''}`
                .toLowerCase()
                .includes(filters.q.toLowerCase())) &&
            (!filters.status || l.status === filters.status) &&
            (!filters.agent ||
              l.assignedAgentId === filters.agent ||
              (filters.agent === 'unassigned' && !l.assignedAgentId)) &&
            (!filters.source || l.source === filters.source) &&
            (!filters.priority || l.priority === filters.priority) &&
            (!filters.followUp || followUpState(l, now) === filters.followUp) &&
            (!filters.from || l.createdAt.slice(0, 10) >= filters.from) &&
            (!filters.to || l.createdAt.slice(0, 10) <= filters.to),
        )
        .sort((a, b) =>
          filters.sort === 'name'
            ? a.customer.name.localeCompare(b.customer.name)
            : filters.sort === 'followUp'
              ? (a.nextFollowUp || '9999').localeCompare(b.nextFollowUp || '9999')
              : filters.sort === 'oldest'
                ? a.createdAt.localeCompare(b.createdAt)
                : b.createdAt.localeCompare(a.createdAt),
        ),
    [data.leads, data.properties, filters, now],
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const pageRows = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const columns = [
    ...(admin
      ? [
          {
            title: 'Select',
            render: (lead) => (
              <input
                type="checkbox"
                className="crm-selection"
                aria-label={`Select ${lead.customer.name}`}
                checked={selected.includes(lead.id)}
                disabled={
                  TERMINAL.includes(lead.status) ||
                  (!selected.includes(lead.id) && selected.length >= 100)
                }
                onChange={(event) =>
                  setSelected((ids) =>
                    event.target.checked ? [...ids, lead.id] : ids.filter((id) => id !== lead.id),
                  )
                }
              />
            ),
          },
        ]
      : []),
    {
      title: 'Lead / customer',
      render: (l) => (
        <>
          <RecordLink to={`${base}/leads/${l.id}`}>{l.customer.name}</RecordLink>
          <small title={l.id}>{l.id.length > 18 ? `${l.id.slice(0, 13)}…` : l.id}</small>
          <small>{l.customer.email}</small>
        </>
      ),
    },
    {
      title: 'Property',
      render: (l) => data.properties.find((p) => p.id === l.propertyId)?.title || 'General inquiry',
    },
    { title: 'Source', render: (l) => l.source },
    ...(admin
      ? [
          {
            title: 'Agent',
            render: (l) =>
              data.agents.find((a) => a.id === l.assignedAgentId)?.name || (
                <span className="crm-muted">Unassigned</span>
              ),
          },
        ]
      : []),
    { title: 'Status', render: (l) => <Badge value={l.status} /> },
    { title: 'Priority', render: (l) => <Badge value={l.priority} /> },
    {
      title: 'Next follow-up',
      render: (l) => (
        <>
          {dateTime(l.nextFollowUp)}
          {followUpState(l, now) === 'overdue' && <Badge value="OVERDUE" />}
          {followUpState(l, now) === 'today' && <Badge value="DUE_TODAY" />}
          {followUpState(l, now) === 'unscheduled' && <small>No follow-up scheduled</small>}
        </>
      ),
    },
    { title: 'Created', render: (l) => dateTime(l.createdAt) },
    {
      title: 'Actions',
      render: (l) => (
        <button
          className="crm-text-button"
          onClick={() => setAction({ action: 'status', lead: l })}
        >
          Change stage
        </button>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title={admin ? 'Leads' : 'My leads'}
        subtitle="Keep every conversation moving toward the right outcome."
      >
        <Button
          secondary
          disabled={!filtered.length}
          onClick={() => downloadCsv('crm-leads.csv', leadExportRows(filtered, data.agents))}
        >
          <Download size={17} /> Export leads
        </Button>
        {admin && (
          <Button onClick={() => setAction({ action: 'create' })}>
            <Plus size={17} /> Add lead
          </Button>
        )}
      </PageHeading>
      <div className="crm-summary-strip">
        <span>
          <strong>{data.leads.length}</strong> total leads
        </span>
        <span>
          <strong>{data.leads.filter((l) => !TERMINAL.includes(l.status)).length}</strong> active
          conversations
        </span>
        <span>
          <strong>{data.leads.filter((l) => l.status === 'WON').length}</strong> won deals
        </span>
      </div>
      <Panel>
        <div className="crm-filters">
          <Field
            label="Follow-up"
            value={filters.followUp || ''}
            onChange={(e) => update('followUp', e.target.value)}
            options={[
              ['', 'All follow-ups'],
              ['overdue', 'Overdue'],
              ['today', 'Due today'],
              ['upcoming', 'Upcoming'],
              ['unscheduled', 'No follow-up scheduled'],
            ]}
          />
          <Field
            label="Search leads"
            value={filters.q || ''}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Name, email, phone or lead ID"
          />
          <Field
            label="Status"
            options={[['', 'All statuses'], ...STAGES]}
            value={filters.status || ''}
            onChange={(e) => update('status', e.target.value)}
          />
          {admin && (
            <Field
              label="Agent"
              options={[
                ['', 'All agents'],
                ['unassigned', 'Unassigned'],
                ...data.agents.map((a) => [a.id, a.name]),
              ]}
              value={filters.agent || ''}
              onChange={(e) => update('agent', e.target.value)}
            />
          )}
          <Field
            label="Source"
            options={[['', 'All sources'], ...SOURCES]}
            value={filters.source || ''}
            onChange={(e) => update('source', e.target.value)}
          />
          <Field
            label="Priority"
            options={[['', 'All priorities'], ...PRIORITIES]}
            value={filters.priority || ''}
            onChange={(e) => update('priority', e.target.value)}
          />
          <Field
            label="Created from"
            type="date"
            value={filters.from || ''}
            onChange={(e) => update('from', e.target.value)}
          />
          <Field
            label="Created to"
            type="date"
            value={filters.to || ''}
            onChange={(e) => update('to', e.target.value)}
          />
          <Field
            label="Sort"
            options={[
              ['newest', 'Newest first'],
              ['oldest', 'Oldest first'],
              ['name', 'Customer name'],
              ['followUp', 'Next follow-up'],
            ]}
            value={filters.sort || 'newest'}
            onChange={(e) => update('sort', e.target.value)}
          />
        </div>
        <div className="crm-list-toolbar">
          <span>{filtered.length} matching leads</span>
          <div className="crm-actions">
            <Button
              secondary
              onClick={() => {
                setFilters({});
                setPage(1);
                setSelected([]);
              }}
            >
              Clear filters
            </Button>
            <Button
              secondary={view !== 'table'}
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
            >
              <List size={16} />
              Table
            </Button>
            <Button
              secondary={view !== 'kanban'}
              onClick={() => setView('kanban')}
              aria-pressed={view === 'kanban'}
            >
              <LayoutGrid size={16} />
              Kanban
            </Button>
          </div>
        </div>
        {admin && view === 'table' && (
          <div className="crm-list-toolbar">
            <span>{selected.length} leads selected (maximum 100)</span>
            <div className="crm-actions">
              <Button
                secondary
                onClick={() =>
                  setSelected((ids) =>
                    [
                      ...new Set([
                        ...ids,
                        ...pageRows
                          .filter((lead) => !TERMINAL.includes(lead.status))
                          .map((lead) => lead.id),
                      ]),
                    ].slice(0, 100),
                  )
                }
              >
                Select page
              </Button>
              <Button secondary disabled={!selected.length} onClick={() => setSelected([])}>
                Clear selection
              </Button>
              <Button disabled={!selected.length} onClick={() => setBulk(true)}>
                <UserRoundCheck size={17} /> Assign selected
              </Button>
            </div>
          </div>
        )}
        {view === 'table' ? (
          <>
            <DataTable columns={columns} rows={pageRows} />
            <Pagination page={currentPage} count={filtered.length} onChange={setPage} />
          </>
        ) : (
          <LeadPipeline
            leads={filtered}
            base={base}
            onStage={(lead) => setAction({ action: 'status', lead })}
          />
        )}
      </Panel>
      {bulk && (
        <FormDialog
          title="Assign selected leads"
          submitLabel="Assign leads"
          onClose={() => setBulk(false)}
          description={`Assign ${selected.length} selected leads and transfer their outstanding tasks and viewings. Closed leads cannot be reassigned.`}
          onSubmit={async (fields) => {
            await run(
              'bulkAssign',
              { ids: selected, agentId: fields.agentId },
              'Selected leads and open work reassigned.',
            );
            setSelected([]);
          }}
        >
          <Field
            label="Assign to agent"
            name="agentId"
            required
            options={[
              ['', 'Choose an active agent'],
              ...data.agents.filter((a) => a.status === 'ACTIVE').map((a) => [a.id, a.name]),
            ]}
          />
          <p className="crm-full">
            {data.leads
              .filter((lead) => selected.includes(lead.id))
              .map((lead) => lead.customer.name)
              .join(', ')}
          </p>
        </FormDialog>
      )}
      {action && (
        <LeadActionDialog
          {...action}
          onClose={() => setAction(null)}
          onCreated={(l) => navigate(`${base}/leads/${l.id}`)}
        />
      )}
    </>
  );
}
export function LeadDetail() {
  const { id } = useParams();
  const data = useSelector(selectWorkspace);
  const user = useSelector(selectUser);
  const lead = data.leads.find((l) => l.id === id);
  const [action, setAction] = useState(null);
  const admin = isAdmin(user);
  const base = admin ? '/admin' : '/agent';
  if (!lead)
    return (
      <EmptyState
        title="Lead unavailable"
        text="This lead does not exist or is not assigned to your account."
      >
        <Button to={`${base}/leads`}>Back to leads</Button>
      </EmptyState>
    );
  const property = data.properties.find((p) => p.id === lead.propertyId);
  const agent = data.agents.find((a) => a.id === lead.assignedAgentId);
  const closed = TERMINAL.includes(lead.status);
  return (
    <>
      <PageHeading
        title={lead.customer.name}
        subtitle={`${lead.id} · Created ${dateTime(lead.createdAt)}`}
      >
        <Badge value={lead.status} />
        <Badge value={lead.priority} />
        <Button secondary to={`${base}/leads`}>
          All leads
        </Button>
      </PageHeading>
      <div className="crm-lead-actions">
        {admin && !closed && <Button onClick={() => setAction('assign')}>Assign agent</Button>}
        <Button secondary onClick={() => setAction('status')}>
          {closed ? 'Reopen lead' : 'Change status'}
        </Button>
        <Button secondary onClick={() => setAction('priority')}>
          Change priority
        </Button>
        <Button secondary onClick={() => setAction('note')}>
          Add note
        </Button>
        {!closed && (
          <>
            <Button secondary onClick={() => setAction('communication')}>
              Log communication
            </Button>
            <Button secondary onClick={() => setAction('followUp')}>
              Schedule follow-up
            </Button>
            <Button secondary onClick={() => setAction('task')}>
              Create task
            </Button>
            <Button secondary onClick={() => setAction('viewing')}>
              Schedule viewing
            </Button>
            <Button onClick={() => setAction('won')}>Mark as Won</Button>
            <Button danger secondary onClick={() => setAction('lost')}>
              Mark as Lost
            </Button>
          </>
        )}
      </div>
      <div className="crm-detail-grid">
        <div className="crm-stack">
          <Panel title="Customer information">
            <dl className="crm-info">
              <div>
                <dt>
                  <Mail size={15} /> Email
                </dt>
                <dd>{lead.customer.email}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={15} /> Phone
                </dt>
                <dd>{lead.customer.phone}</dd>
              </div>
              <div>
                <dt>
                  <MapPin size={15} /> Country
                </dt>
                <dd>{lead.customer.country}</dd>
              </div>
              <div>
                <dt>Preferred contact</dt>
                <dd>{lead.preferredContact}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>
                  {money(lead.budget.min)} – {lead.budget.max ? money(lead.budget.max) : 'Open'}
                </dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{label(lead.purpose)}</dd>
              </div>
              <div>
                <dt>Preferred location</dt>
                <dd>{lead.preferredLocation || 'Open to recommendations'}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Property interest">
            {property ? (
              <div className="crm-interest">
                <Photo src={property.images[0]} alt={property.title} />
                <h3>{property.title}</h3>
                <p>{property.location}</p>
                <strong>{money(property.price)}</strong>
                {property.status === 'ACTIVE' && (
                  <RecordLink to={`/property/${property.slug}`}>View public listing</RecordLink>
                )}
              </div>
            ) : (
              <p className="crm-pad crm-muted">General property inquiry</p>
            )}
          </Panel>
          <Panel title="Lead information">
            <dl className="crm-info">
              <div>
                <dt>Source</dt>
                <dd>{lead.source}</dd>
              </div>
              <div>
                <dt>Assigned agent</dt>
                <dd>
                  {agent ? (
                    admin ? (
                      <Link to={`/admin/agents/${agent.id}`}>{agent.name}</Link>
                    ) : (
                      agent.name
                    )
                  ) : (
                    'Unassigned'
                  )}
                </dd>
              </div>
              <div>
                <dt>Assigned on</dt>
                <dd>{dateTime(lead.assignedAt)}</dd>
              </div>
              <div>
                <dt>Next follow-up</dt>
                <dd>{dateTime(lead.nextFollowUp)}</dd>
              </div>
            </dl>
          </Panel>
          {lead.deal && (
            <Panel title="Won deal">
              <dl className="crm-info">
                <div>
                  <dt>Final property</dt>
                  <dd>{data.properties.find((p) => p.id === lead.deal.propertyId)?.title}</dd>
                </div>
                <div>
                  <dt>Deal value</dt>
                  <dd>{money(lead.deal.value)}</dd>
                </div>
                <div>
                  <dt>Closing date</dt>
                  <dd>{dateTime(lead.deal.closingDate)}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{lead.deal.notes || '—'}</dd>
                </div>
              </dl>
            </Panel>
          )}
          {lead.lostReason && (
            <Panel title="Lost outcome">
              <p className="crm-pad">
                {lead.lostReason}
                <br />
                {lead.lostNotes}
              </p>
            </Panel>
          )}
        </div>
        <div className="crm-stack">
          <Panel title="Activity timeline">
            <Timeline activities={data.activities.filter((a) => a.leadId === id)} />
          </Panel>
          <Panel
            title="Notes"
            action={
              <Button secondary onClick={() => setAction('note')}>
                Add note
              </Button>
            }
          >
            {data.notes.filter((n) => n.leadId === id).length ? (
              <div className="crm-notes">
                {data.notes
                  .filter((n) => n.leadId === id)
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((n) => (
                    <article key={n.id}>
                      <p>{n.content}</p>
                      <small>
                        {n.author} · {dateTime(n.createdAt)}
                      </small>
                    </article>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="No notes yet"
                text="Keep customer preferences and useful context here."
              />
            )}
          </Panel>
          <Panel title="Tasks & viewings">
            <div className="crm-linked-work">
              {data.tasks
                .filter((t) => t.leadId === id)
                .map((t) => (
                  <Link key={t.id} to={`${base}/tasks?record=${t.id}`}>
                    <span>
                      {t.title}
                      <small>{dateTime(t.dueDate)}</small>
                    </span>
                    <Badge value={t.status} />
                  </Link>
                ))}
              {data.viewings
                .filter((v) => v.leadId === id)
                .map((v) => (
                  <Link key={v.id} to={`${base}/viewings?record=${v.id}`}>
                    <span>
                      Property viewing<small>{dateTime(v.date)}</small>
                    </span>
                    <Badge value={v.status} />
                  </Link>
                ))}
            </div>
          </Panel>
        </div>
      </div>
      {action && <LeadActionDialog action={action} lead={lead} onClose={() => setAction(null)} />}
    </>
  );
}
