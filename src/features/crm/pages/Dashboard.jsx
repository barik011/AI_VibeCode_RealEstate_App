import { useState } from 'react';
import { useSelector } from 'react-redux';
import { House, Users, CalendarDays, Trophy, Clock, Target } from 'lucide-react';
import { selectUser, selectWorkspace } from '../store';
import { isAdmin, TERMINAL, STAGES, taskStatus, dateKey, dateTime, money } from '../constants';
import {
  Badge,
  Bars,
  Button,
  DataTable,
  PageHeading,
  Panel,
  RecordLink,
  StatCard,
  Timeline,
} from '../components/UI';
import { LeadActionDialog } from '../components/LeadActions';
export const countBy = (rows, key) =>
  Object.entries(
    rows.reduce((counts, row) => {
      const value = typeof key === 'function' ? key(row) : row[key];
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {}),
  );
export function AgentPerformance({ data }) {
  return (
    <DataTable
      rows={data.agents}
      columns={[
        {
          title: 'Agent',
          render: (a) => <RecordLink to={`/admin/agents/${a.id}`}>{a.name}</RecordLink>,
        },
        {
          title: 'Active leads',
          render: (a) =>
            data.leads.filter((l) => l.assignedAgentId === a.id && !TERMINAL.includes(l.status))
              .length,
        },
        {
          title: 'Won deals',
          render: (a) =>
            data.leads.filter((l) => l.assignedAgentId === a.id && l.status === 'WON').length,
        },
        {
          title: 'Closed value',
          render: (a) =>
            money(
              data.leads
                .filter((l) => l.assignedAgentId === a.id && l.status === 'WON')
                .reduce((sum, l) => sum + (l.deal?.value || 0), 0),
            ),
        },
      ]}
    />
  );
}
export function Dashboard() {
  const data = useSelector(selectWorkspace);
  const user = useSelector(selectUser);
  const admin = isAdmin(user);
  const base = admin ? '/admin' : '/agent';
  const [action, setAction] = useState(null);
  const count = (status) => data.leads.filter((l) => l.status === status).length;
  const upcoming = data.viewings
    .filter((v) => v.status === 'SCHEDULED')
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayTasks = data.tasks.filter(
    (t) => dateKey(t.dueDate) === dateKey() && !['COMPLETED', 'CANCELLED'].includes(t.status),
  );
  const stats = admin
    ? [
        ['Total properties', data.properties.length, House],
        ['Active properties', data.properties.filter((p) => p.status === 'ACTIVE').length, House],
        ['Total leads', data.leads.length, Users],
        ['New leads', count('NEW'), Users],
        ['Qualified leads', count('QUALIFIED'), Target],
        ['Viewings scheduled', upcoming.length, CalendarDays],
        ['Won deals', count('WON'), Trophy],
        ['Lost leads', count('LOST'), Users],
        ['Active agents', data.agents.filter((a) => a.status === 'ACTIVE').length, Users],
      ]
    : [
        ['My active leads', data.leads.filter((l) => !TERMINAL.includes(l.status)).length, Users],
        ['Today’s follow-ups', todayTasks.filter((t) => t.isFollowUp).length, Clock],
        [
          'Upcoming viewings',
          upcoming.filter((v) => new Date(v.date) >= new Date()).length,
          CalendarDays,
        ],
        ['Overdue tasks', data.tasks.filter((t) => taskStatus(t) === 'OVERDUE').length, Clock],
        ['Won deals', count('WON'), Trophy],
      ];
  return (
    <>
      <PageHeading
        title={admin ? 'Sales overview' : `Welcome back, ${user.name.split(' ')[0]}.`}
        subtitle={
          admin
            ? 'A clear view of your properties, people and pipeline.'
            : 'Your conversations, priorities and next opportunities.'
        }
      >
        <span className="crm-date-chip">
          {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(new Date())}
        </span>
      </PageHeading>
      <div className="crm-welcome">
        <div>
          <p className="crm-eyebrow">LET’S MOVE THINGS FORWARD</p>
          <h2>
            {admin
              ? 'Build relationships. Close with confidence.'
              : 'The next conversation starts here.'}
          </h2>
          <p>
            {count('NEW')} new inquiries · {upcoming.length} scheduled viewings ·{' '}
            {todayTasks.length} tasks today
          </p>
        </div>
        <div className="crm-actions">
          {admin && <Button onClick={() => setAction('create')}>+ Add lead</Button>}
          <Button secondary onClick={() => setAction('viewing')}>
            Schedule viewing
          </Button>
        </div>
      </div>
      <div className="crm-stats">
        {stats.map(([title, value, icon]) => (
          <StatCard key={title} title={title} value={value} icon={icon} />
        ))}
      </div>
      <div className="crm-quick-actions">
        {admin && (
          <>
            <Button secondary onClick={() => setAction('assign')}>
              Assign lead
            </Button>
            <Button secondary to="/admin/properties?add=1">
              Add property
            </Button>
          </>
        )}
        <Button secondary onClick={() => setAction('task')}>
          Create task
        </Button>
        <Button secondary to={`${base}/leads`}>
          Open pipeline
        </Button>
      </div>
      <div className="crm-two-column">
        <Panel
          title="Lead pipeline"
          action={<RecordLink to={`${base}/leads`}>View leads</RecordLink>}
        >
          <Bars entries={STAGES.map((s) => [s, count(s)])} />
        </Panel>
        <Panel title={admin ? 'Lead sources' : 'Today’s tasks'}>
          {admin ? (
            <Bars entries={countBy(data.leads, 'source')} />
          ) : (
            <DataTable
              rows={todayTasks}
              columns={[
                {
                  title: 'Task',
                  render: (t) => (
                    <RecordLink to={`${base}/tasks?record=${t.id}`}>{t.title}</RecordLink>
                  ),
                },
                { title: 'Due', render: (t) => dateTime(t.dueDate) },
                { title: 'Status', render: (t) => <Badge value={taskStatus(t)} /> },
              ]}
            />
          )}
        </Panel>
        <Panel
          title="Recent leads"
          action={<RecordLink to={`${base}/leads`}>All leads</RecordLink>}
        >
          <DataTable
            rows={[...data.leads]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)}
            columns={[
              {
                title: 'Customer',
                render: (l) => (
                  <RecordLink to={`${base}/leads/${l.id}`}>{l.customer.name}</RecordLink>
                ),
              },
              { title: 'Status', render: (l) => <Badge value={l.status} /> },
              { title: 'Source', render: (l) => l.source },
            ]}
          />
        </Panel>
        <Panel
          title="Upcoming viewings"
          action={<RecordLink to={`${base}/viewings`}>All viewings</RecordLink>}
        >
          <DataTable
            rows={upcoming.slice(0, 5)}
            columns={[
              {
                title: 'Customer',
                render: (v) => (
                  <RecordLink to={`${base}/viewings?record=${v.id}`}>
                    {data.leads.find((l) => l.id === v.leadId)?.customer.name}
                  </RecordLink>
                ),
              },
              { title: 'Scheduled', render: (v) => dateTime(v.date) },
              { title: 'Meeting', render: (v) => v.meetingLocation },
            ]}
          />
        </Panel>
        {admin && (
          <Panel title="Agent performance">
            <AgentPerformance data={data} />
          </Panel>
        )}
        <Panel title="Recent activities">
          <Timeline
            activities={[...data.activities]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 6)}
          />
        </Panel>
      </div>
      {action && <LeadActionDialog action={action} onClose={() => setAction(null)} />}
    </>
  );
}
export function Reports() {
  const data = useSelector(selectWorkspace);
  const won = data.leads.filter((l) => l.status === 'WON');
  const lost = data.leads.filter((l) => l.status === 'LOST');
  const active = data.leads.filter((l) => !TERMINAL.includes(l.status));
  return (
    <>
      <PageHeading
        title="Reports & insights"
        subtitle="Live analytics calculated from your CRM records."
      />
      <div className="crm-stats">
        <StatCard
          title="Pipeline value"
          value={money(active.reduce((sum, l) => sum + (l.budget.max || 0), 0))}
          detail="Sum of maximum budgets for open leads"
        />
        <StatCard
          title="Won deal value"
          value={money(won.reduce((sum, l) => sum + (l.deal?.value || 0), 0))}
          detail="Confirmed closing values"
        />
        <StatCard
          title="Closed-lead win rate"
          value={`${won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0}%`}
          detail="Won ÷ (won + lost)"
        />
      </div>
      <div className="crm-two-column">
        <Panel title="Lead status distribution">
          <Bars entries={STAGES.map((s) => [s, data.leads.filter((l) => l.status === s).length])} />
        </Panel>
        <Panel title="Leads by source">
          <Bars entries={countBy(data.leads, 'source')} />
        </Panel>
        <Panel title="Leads by agent">
          <Bars
            entries={countBy(
              data.leads,
              (l) => data.agents.find((a) => a.id === l.assignedAgentId)?.name || 'Unassigned',
            )}
          />
        </Panel>
        <Panel title="Viewings by month">
          <Bars
            entries={countBy(data.viewings, (v) => v.date.slice(0, 7)).sort(([a], [b]) =>
              a.localeCompare(b),
            )}
          />
        </Panel>
        <Panel title="Won vs lost">
          <Bars
            entries={[
              ['Won', won.length],
              ['Lost', lost.length],
            ]}
          />
        </Panel>
        <Panel title="Pipeline value by stage">
          <Bars
            entries={STAGES.filter((s) => !TERMINAL.includes(s)).map((s) => [
              s,
              active.filter((l) => l.status === s).reduce((sum, l) => sum + (l.budget.max || 0), 0),
            ])}
            format={money}
          />
        </Panel>
      </div>
      <Panel title="Agent performance">
        <AgentPerformance data={data} />
      </Panel>
    </>
  );
}
