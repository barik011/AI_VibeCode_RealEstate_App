import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
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
  return (
    <>
      <PageHeading
        title="Our agents"
        subtitle="The people turning property searches into lasting relationships."
      />
      <Panel>
        <div className="crm-work-filters">
          <Field label="Search agents" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Panel>
      <div className="crm-agent-grid">
        {data.agents
          .filter((a) =>
            `${a.name} ${a.specialization}`.toLowerCase().includes(query.toLowerCase()),
          )
          .map((agent) => {
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
              </article>
            );
          })}
      </div>
    </>
  );
}
export function AgentDetail({ profile = false }) {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const data = useSelector(selectWorkspace);
  const agent = data.agents.find((a) => a.id === (profile ? user.agentId : id));
  const [edit, setEdit] = useState(false);
  const run = useCommand();
  if (!agent) return <EmptyState title="Agent not found" />;
  const leads = data.leads.filter((l) => l.assignedAgentId === agent.id);
  const ids = new Set(leads.map((l) => l.id));
  const base = isAdmin(user) ? '/admin' : '/agent';
  return (
    <>
      <PageHeading title={profile ? 'My profile' : agent.name} subtitle={agent.specialization}>
        <Button secondary onClick={() => setEdit(true)}>
          Edit profile
        </Button>
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
        <FormDialog
          title="Edit agent profile"
          onClose={() => setEdit(false)}
          onSubmit={(fields) => run('saveAgent', { ...fields, id: agent.id }, 'Profile updated.')}
        >
          <Field label="Name" name="name" required defaultValue={agent.name} />
          <Field label="Phone" name="phone" required defaultValue={agent.phone} />
          <Field
            label="Specialization"
            name="specialization"
            required
            defaultValue={agent.specialization}
          />
          <Field
            label="Languages (comma separated)"
            name="languages"
            required
            defaultValue={agent.languages.join(', ')}
          />
          {isAdmin(user) && (
            <Field
              label="Status"
              name="status"
              options={['ACTIVE', 'INACTIVE']}
              defaultValue={agent.status}
            />
          )}
        </FormDialog>
      )}
    </>
  );
}
export const Profile = () => <AgentDetail profile />;
