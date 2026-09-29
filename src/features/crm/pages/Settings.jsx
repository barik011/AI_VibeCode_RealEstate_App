import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectWorkspace } from '../store';
import { STAGES } from '../constants';
import { Badge, Button, Field, FormDialog, PageHeading, Panel, useCommand } from '../components/UI';
import { crmService } from '../../../services/crmService';
import { useToast } from '../../../components/ui';
export function Settings() {
  const data = useSelector(selectWorkspace);
  const [reset, setReset] = useState(false);
  const [error, setError] = useState('');
  const run = useCommand();
  const toast = useToast();
  return (
    <>
      <PageHeading
        title="Workspace settings"
        subtitle="Company details, workflow preferences and demo controls."
      />
      <div className="crm-two-column">
        <Panel title="Company profile & preferences">
          <form
            className="crm-settings-form"
            key={JSON.stringify(data.settings)}
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                await run(
                  'saveSettings',
                  Object.fromEntries(new FormData(e.currentTarget)),
                  'Workspace settings saved.',
                );
              } catch (failure) {
                setError(failure.message);
              }
            }}
          >
            <Field
              label="Company name"
              name="company"
              required
              defaultValue={data.settings.company}
            />
            <Field
              label="Company email"
              name="email"
              type="email"
              required
              defaultValue={data.settings.email}
            />
            <Field label="Company phone" name="phone" required defaultValue={data.settings.phone} />
            <Field
              label="Default lead view"
              name="defaultView"
              options={[
                ['table', 'Table'],
                ['kanban', 'Kanban'],
              ]}
              defaultValue={data.settings.defaultView}
            />
            {error && (
              <p className="crm-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit">Save settings</Button>
          </form>
        </Panel>
        <div className="crm-stack">
          <Panel title="Lead stages">
            <p className="crm-pad crm-muted">
              Stages are fixed for this demo to keep workflow rules consistent.
            </p>
            <div className="crm-stage-list">
              {STAGES.map((s) => (
                <Badge key={s} value={s} />
              ))}
            </div>
          </Panel>
          <Panel title="Demo data">
            <div className="crm-pad">
              <p>
                Restore the original 40 leads, 6 agents, 28 tasks, 14 viewings and 20 properties.
                This removes CRM changes and inquiries from this browser’s CRM. Public favorites and
                language preferences are preserved.
              </p>
              <Button danger onClick={() => setReset(true)}>
                Reset Demo Data
              </Button>
            </div>
          </Panel>
          <Panel title="About this workspace">
            <p className="crm-pad">
              Demo Mode uses browser-local repositories. Authentication and route guards are
              demonstration controls. No Supabase connection or real messaging is enabled.
            </p>
          </Panel>
        </div>
      </div>
      {reset && (
        <FormDialog
          title="Reset demo data?"
          submitLabel="Reset Demo Data"
          onClose={() => setReset(false)}
          onSubmit={async () => {
            await crmService.reset();
            toast('Demo data restored.');
          }}
        >
          <p>
            All local CRM edits, inquiries, notes and outcomes will be replaced by the original seed
            data. This cannot be undone.
          </p>
          <label className="crm-check">
            <input type="checkbox" required /> I understand and want to reset the CRM.
          </label>
        </FormDialog>
      )}
    </>
  );
}
