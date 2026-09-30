import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectWorkspace } from '../store';
import { STAGES } from '../constants';
import { Badge, Button, Field, FormDialog, PageHeading, Panel, useCommand } from '../components/UI';
import { crmService } from '../../../services/crmService';
import { useToast } from '../../../components/ui';
import { isSupabase } from '../../../services/supabase/client';
import { migrationService } from '../../../services/migrationService';
export function Settings() {
  const data = useSelector(selectWorkspace);
  const [reset, setReset] = useState(false);
  const [importing, setImporting] = useState(false);
  const localData = migrationService.preview();
  const [error, setError] = useState('');
  const run = useCommand();
  const toast = useToast();
  return (
    <>
      <PageHeading
        title="Workspace settings"
        subtitle={
          isSupabase
            ? 'Company details, workflow preferences and data migration.'
            : 'Company details, workflow preferences and demo controls.'
        }
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
              Stages follow the shared sales workflow to keep records consistent.
            </p>
            <div className="crm-stage-list">
              {STAGES.map((s) => (
                <Badge key={s} value={s} />
              ))}
            </div>
          </Panel>
          {isSupabase ? (
            <Panel title="Import browser data">
              <div className="crm-pad">
                <p>
                  {localData
                    ? `${localData.counts.leads} local leads, ${localData.counts.properties} properties, ${localData.counts.tasks} tasks, ${localData.counts.viewings} viewings and ${localData.counts.newsletter} newsletter subscriptions found.`
                    : 'No previous local CRM or inquiry data was found in this browser.'}
                </p>
                <p>
                  Import browser records into Supabase. You can preserve matching remote records or
                  explicitly apply your local edits. Your local copy remains available.
                </p>
                <Button disabled={!localData} onClick={() => setImporting(true)}>
                  Import local records
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel title="Demo data">
              <div className="crm-pad">
                <p>
                  Restore the original 40 leads, 6 agents, 28 tasks, 14 viewings and 20 properties.
                  This removes CRM changes and inquiries from this browser’s CRM. Public favorites
                  and language preferences are preserved.
                </p>
                <Button danger onClick={() => setReset(true)}>
                  Reset Demo Data
                </Button>
              </div>
            </Panel>
          )}
          <Panel title="About this workspace">
            <p className="crm-pad">
              {isSupabase
                ? 'Records are stored in Supabase. Database policies enforce team roles and assignment access. Communication actions record conversations; they do not send messages.'
                : 'Demo Mode uses browser-local repositories. Authentication and route guards are demonstration controls. No Supabase connection or real messaging is enabled.'}
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
      {importing && (
        <FormDialog
          title="Import local CRM records?"
          submitLabel="Import records"
          onClose={() => setImporting(false)}
          onSubmit={async (fields) => {
            await migrationService.import(fields.overwrite === 'on');
            toast('Local records imported.');
          }}
        >
          <p>
            This imports records from this browser into the shared database. Matching IDs are
            skipped unless you choose to apply local edits. Local data is retained as a backup.
          </p>
          <label className="crm-check">
            <input name="overwrite" type="checkbox" /> Apply local edits to matching records. This
            replaces their current database values.
          </label>
          <label className="crm-check">
            <input type="checkbox" required /> I have reviewed the record counts and want to import.
          </label>
        </FormDialog>
      )}
    </>
  );
}
