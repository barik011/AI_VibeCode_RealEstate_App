import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { agentImpact } from '../agentRules';
import { selectUser, selectWorkspace } from '../store';
import { TERMINAL, isAdmin, dateTime } from '../constants';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  FormDialog,
  PageHeading,
  Panel,
  RecordLink,
  StatCard,
  Timeline,
  useCommand,
} from '../components/UI';
export function Agents() {
  const data = useSelector(selectWorkspace);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [action, setAction] = useState(null);
  const user = useSelector(selectUser);
  const agents = data.agents
    .filter(
      (agent) =>
        (!status || agent.status === status) &&
        [
          agent.name,
          agent.email,
          agent.phone,
          agent.specialization,
          ...agent.locations,
          ...agent.languages,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'workload'
        ? agentImpact(data, b.id).openLeads - agentImpact(data, a.id).openLeads ||
          a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
  return (
    <>
      <PageHeading
        title="Our agents"
        subtitle="Manage your team, availability and assigned workload."
      >
        <Button
          className="crm-icon-action"
          aria-label="Add agent"
          title="Add agent"
          onClick={() => setAction({ mode: 'create' })}
        >
          <Plus size={18} />
        </Button>
      </PageHeading>
      <div className="crm-stats">
        <StatCard title="Total agents" value={data.agents.length} />
        <StatCard
          title="Active agents"
          value={data.agents.filter((a) => a.status === 'ACTIVE').length}
        />
        <StatCard
          title="Inactive agents"
          value={data.agents.filter((a) => a.status === 'INACTIVE').length}
        />
      </div>
      <Panel>
        <div className="crm-work-filters">
          <Field
            label="Search agents"
            value={query}
            placeholder="Name, email, phone, location or language"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Field
            label="Agent status"
            value={status}
            options={[['', 'All statuses'], 'ACTIVE', 'INACTIVE']}
            onChange={(e) => setStatus(e.target.value)}
          />
          <Field
            label="Sort agents"
            value={sort}
            options={[
              ['name', 'Name'],
              ['workload', 'Highest open workload'],
            ]}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
      </Panel>
      <div className="crm-agent-grid">
        {agents.map((agent) => {
          const leads = data.leads.filter((l) => l.assignedAgentId === agent.id);
          return (
            <article className="crm-panel crm-agent-card" key={agent.id}>
              <div className="crm-between">
                <span className="crm-avatar large">
                  {agent.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
                <Badge value={agent.status} />
              </div>
              <h2>
                <RecordLink to={`/admin/agents/${agent.id}`}>{agent.name}</RecordLink>
              </h2>
              <p>{agent.specialization}</p>
              <small>{agent.email}</small>
              <small>{agent.phone}</small>
              <small>{agent.locations.join(' · ')}</small>
              <dl>
                <div>
                  <dt>Assigned</dt>
                  <dd>{leads.length}</dd>
                </div>
                <div>
                  <dt>Active</dt>
                  <dd>{leads.filter((l) => !TERMINAL.includes(l.status)).length}</dd>
                </div>
                <div>
                  <dt>Viewings</dt>
                  <dd>
                    {
                      data.viewings.filter(
                        (v) => v.agentId === agent.id && v.status === 'SCHEDULED',
                      ).length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Won</dt>
                  <dd>{leads.filter((l) => l.status === 'WON').length}</dd>
                </div>
              </dl>
              <div className="crm-actions">
                <Button
                  secondary
                  className="crm-icon-action"
                  aria-label={`Edit ${agent.name}`}
                  title="Edit agent"
                  onClick={() => setAction({ mode: 'edit', agent })}
                >
                  <Pencil size={18} />
                </Button>
                <Button
                  danger
                  secondary
                  className="crm-icon-action"
                  aria-label={`Delete ${agent.name}`}
                  title="Delete agent"
                  onClick={() => setAction({ mode: 'delete', agent })}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!agents.length && (
        <EmptyState
          title="No matching agents"
          text="Adjust the search or status filter, or add an agent."
        />
      )}
      <Panel title="Team activity">
        <Timeline
          activities={[...(data.agentEvents || [])]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 20)}
        />
      </Panel>
      {action && (
        <AgentDialog
          {...action}
          data={data}
          admin={isAdmin(user)}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}

function AgentDialog({ mode, agent, data, admin, onClose, onDeleted }) {
  const run = useCommand();
  if (mode === 'delete') {
    const impact = agentImpact(data, agent.id);
    return (
      <FormDialog
        title={`Delete ${agent.name}?`}
        danger
        submitLabel="Delete agent"
        pendingLabel="Deleting..."
        submitDisabled={Boolean(impact.linked)}
        onClose={onClose}
        description={
          impact.linked
            ? 'This agent has linked CRM history. Reassign open work, then edit the profile and set its status to Inactive. Existing records will be preserved.'
            : 'This permanently removes the agent record. Agents with a linked login account cannot be deleted; deactivate them instead.'
        }
        onSubmit={async (fields) => {
          await run(
            'deleteAgent',
            { id: agent.id, confirmName: fields.confirmName },
            'Agent deleted.',
          );
          onDeleted?.();
        }}
      >
        {impact.linked ? (
          <div className="crm-full">
            <p>
              {impact.leads} linked leads · {impact.openTasks} open tasks ·{' '}
              {impact.scheduledViewings} scheduled viewings
            </p>
            <Button secondary to={`/admin/leads?agent=${agent.id}`}>
              Manage assigned leads
            </Button>
          </div>
        ) : (
          <Field
            label="Type agent name to confirm"
            name="confirmName"
            required
            autoComplete="off"
          />
        )}
      </FormDialog>
    );
  }
  return (
    <FormDialog
      title={agent ? 'Edit agent profile' : 'Add agent'}
      onClose={onClose}
      description={
        !agent
          ? 'Create a team record for lead assignment. Login access is managed separately by your administrator.'
          : undefined
      }
      onSubmit={(fields) =>
        run(
          agent ? 'saveAgent' : 'createAgent',
          { ...fields, ...(agent ? { id: agent.id } : {}) },
          agent ? 'Profile updated.' : 'Agent added.',
        )
      }
    >
      <Field label="Name" name="name" required maxLength={200} defaultValue={agent?.name || ''} />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        maxLength={254}
        readOnly={Boolean(agent)}
        defaultValue={agent?.email || ''}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        required
        maxLength={20}
        defaultValue={agent?.phone || ''}
      />
      <Field
        label="Specialization"
        name="specialization"
        required
        maxLength={200}
        defaultValue={agent?.specialization || ''}
      />
      <Field
        label="Languages (comma separated)"
        name="languages"
        required
        maxLength={1000}
        defaultValue={agent?.languages.join(', ') || ''}
      />
      <Field
        label="Locations (comma separated)"
        name="locations"
        required
        maxLength={1000}
        defaultValue={agent?.locations.join(', ') || ''}
      />
      {admin && (
        <Field
          label="Status"
          name="status"
          options={['ACTIVE', 'INACTIVE']}
          defaultValue={agent?.status || 'ACTIVE'}
        />
      )}
      {agent && admin && (
        <p className="crm-field-help">
          Reassign open leads and outstanding work before setting an agent to Inactive.
        </p>
      )}
    </FormDialog>
  );
}
export function AgentDetail({ profile = false }) {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const data = useSelector(selectWorkspace);
  const agent = data.agents.find((a) => a.id === (profile ? user.agentId : id));
  const [edit, setEdit] = useState(null);
  const navigate = useNavigate();
  if (!agent) return <EmptyState title="Agent not found" />;
  const leads = data.leads.filter((l) => l.assignedAgentId === agent.id);
  const ids = new Set(leads.map((l) => l.id));
  const base = isAdmin(user) ? '/admin' : '/agent';
  return (
    <>
      <PageHeading title={profile ? 'My profile' : agent.name} subtitle={agent.specialization}>
        <Button
          secondary
          className="crm-icon-action"
          aria-label="Edit profile"
          title="Edit profile"
          onClick={() => setEdit('edit')}
        >
          <Pencil size={18} />
        </Button>
        {isAdmin(user) && (
          <Button
            danger
            secondary
            className="crm-icon-action"
            aria-label={`Delete ${agent.name}`}
            title="Delete agent"
            onClick={() => setEdit('delete')}
          >
            <Trash2 size={18} />
          </Button>
        )}
      </PageHeading>
      <div className="crm-stats">
        <StatCard title="Assigned leads" value={leads.length} />
        <StatCard
          title="Active leads"
          value={leads.filter((l) => !TERMINAL.includes(l.status)).length}
        />
        <StatCard title="Won deals" value={leads.filter((l) => l.status === 'WON').length} />
      </div>
      <div className="crm-two-column">
        <Panel title="Agent profile">
          <dl className="crm-info">
            <div>
              <dt>Name</dt>
              <dd>{agent.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{agent.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{agent.phone}</dd>
            </div>
            <div>
              <dt>Languages</dt>
              <dd>{agent.languages.join(', ')}</dd>
            </div>
            <div>
              <dt>Locations</dt>
              <dd>{agent.locations.join(', ')}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge value={agent.status} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Assigned leads">
          <DataTable
            rows={leads}
            columns={[
              {
                title: 'Customer',
                render: (l) => (
                  <RecordLink to={`${base}/leads/${l.id}`}>{l.customer.name}</RecordLink>
                ),
              },
              { title: 'Status', render: (l) => <Badge value={l.status} /> },
            ]}
          />
        </Panel>
        <Panel title="Upcoming viewings">
          <DataTable
            rows={data.viewings.filter((v) => v.agentId === agent.id && v.status === 'SCHEDULED')}
            columns={[
              {
                title: 'Customer',
                render: (v) => (
                  <RecordLink to={`${base}/viewings?record=${v.id}`}>
                    {leads.find((l) => l.id === v.leadId)?.customer.name}
                  </RecordLink>
                ),
              },
              { title: 'Date', render: (v) => dateTime(v.date) },
            ]}
          />
        </Panel>
        <Panel title="Recent activities">
          <Timeline
            activities={data.activities
              .filter((a) => ids.has(a.leadId))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 8)}
          />
        </Panel>
      </div>
      {edit && (
        <AgentDialog
          mode={edit}
          agent={agent}
          data={data}
          admin={isAdmin(user)}
          onClose={() => setEdit(null)}
          onDeleted={() => navigate('/admin/agents')}
        />
      )}
    </>
  );
}
export const Profile = () => <AgentDetail profile />;
