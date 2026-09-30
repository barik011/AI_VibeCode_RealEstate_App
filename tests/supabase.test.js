import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { createSeed } from '../src/repositories/seed.js';

test('Supabase migrations, server workflow and RLS isolate anonymous and agent access', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
      grant usage on schema auth to anon,authenticated,service_role;`);
    for (const file of readdirSync('supabase/migrations')
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      try {
        await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
      } catch (error) {
        throw new Error(`${file}: ${error.message}`);
      }
    }
    await db.exec("set request.jwt.claim.role='service_role'");
    await db.query('select public.import_crm_data($1::jsonb)', [JSON.stringify(createSeed())]);
    const adminId = '00000000-0000-4000-8000-000000000001';
    const agentId = '00000000-0000-4000-8000-000000000002';
    await db.query('insert into auth.users values ($1),($2)', [adminId, agentId]);
    await db.query(
      "insert into public.profiles(id,name,role,agent_id) values ($1,'Admin','ADMIN',null),($2,'Sarah Ahmed','AGENT','agent-1')",
      [adminId, agentId],
    );
    const asRole = async (role, uid = '') => {
      await db.exec(`reset role;set role ${role}`);
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [uid, role],
      );
    };
    const command = async (name, payload) =>
      (
        await db.query('select public.crm_command($1,$2::jsonb) as result', [
          name,
          JSON.stringify(payload),
        ])
      ).rows[0].result;
    let leadId;
    await t.test(
      'anonymous can browse active properties and submit an inquiry but cannot read CRM',
      async () => {
        await asRole('anon');
        assert.equal((await db.query('select id from public.properties')).rows.length, 20);
        await assert.rejects(db.query('select * from public.leads'), /permission denied/);
        await assert.rejects(command('createLead', {}), /permission denied/);
        const result = await db.query('select public.submit_inquiry($1::jsonb) as result', [
          JSON.stringify({
            name: 'SQL Workflow',
            email: 'sql@example.com',
            phone: '+971501234567',
            country: 'UAE',
            propertyId: 1,
            message: 'Please arrange a property viewing.',
          }),
        ]);
        leadId = result.rows[0].result.id;
        assert.ok(leadId.startsWith('LEAD-'));
      },
    );
    await t.test('agent cannot read or change an unassigned or unrelated lead', async () => {
      await asRole('authenticated', agentId);
      assert.equal(
        (await db.query('select id from public.leads where id=$1', [leadId])).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select id from public.leads where id='LEAD-1003'")).rows.length,
        0,
      );
      await assert.rejects(
        command('note', { id: leadId, content: 'Unauthorized' }),
        /unavailable|assigned/,
      );
      await assert.rejects(command('assign', { id: leadId, agentId: 'agent-1' }), /Administrator/);
      await assert.rejects(
        db.query("update public.profiles set role='ADMIN' where id=$1", [agentId]),
        /permission denied/,
      );
      await assert.rejects(
        db.query('select public.import_crm_data($1::jsonb)', ['{}']),
        /Administrator/,
      );
    });
    await t.test(
      'admin assigns, agent processes, server validates viewing time and closes won',
      async () => {
        await asRole('authenticated', adminId);
        await command('assign', { id: leadId, agentId: 'agent-1' });
        await asRole('authenticated', agentId);
        await command('communication', { id: leadId, type: 'Call', content: 'Budget agreed.' });
        await command('note', { id: leadId, content: 'Sea view preferred.' });
        const date = new Date(Date.now() + 20 * 86400000).toISOString();
        const task = await command('createTask', {
          leadId,
          title: 'Call customer',
          dueDate: date,
          isFollowUp: true,
        });
        assert.ok(task.id);
        await command('updateTask', { id: task.id, status: 'COMPLETED' });
        const viewing = await command('createViewing', {
          leadId,
          propertyId: 1,
          date,
          meetingLocation: 'Lobby',
        });
        await assert.rejects(
          command('updateViewing', {
            id: viewing.id,
            action: 'complete',
            outcome: 'Interested',
            notes: 'Ready.',
          }),
          /after its scheduled time/,
        );
        await db.exec('reset role');
        await db.query("update public.viewings set date=now()-interval '1 hour' where id=$1", [
          viewing.id,
        ]);
        await asRole('authenticated', agentId);
        await command('updateViewing', {
          id: viewing.id,
          action: 'complete',
          outcome: 'Interested',
          notes: 'Ready for negotiation.',
        });
        assert.equal(
          (await db.query('select status from public.leads where id=$1', [leadId])).rows[0].status,
          'NEGOTIATION',
        );
        await assert.rejects(
          command('won', {
            id: leadId,
            propertyId: 1,
            value: 2000000,
            closingDate: new Date().toISOString(),
          }),
          /Confirm/,
        );
        await command('won', {
          id: leadId,
          confirmed: true,
          propertyId: 1,
          value: 27500000,
          closingDate: new Date().toISOString(),
        });
        assert.equal(
          (await db.query('select status from public.leads where id=$1', [leadId])).rows[0].status,
          'WON',
        );
        assert.ok(
          (
            await db.query(
              "select id from public.lead_activities where lead_id=$1 and type='WON'",
              [leadId],
            )
          ).rows.length,
        );
      },
    );
    await t.test(
      'reopening, lost validation, property edit and settings use authorized RPCs',
      async () => {
        await asRole('authenticated', adminId);
        await command('status', { id: leadId, status: 'FOLLOW_UP' });
        await assert.rejects(command('lost', { id: leadId, reason: '' }), /lost reason/);
        await command('lost', { id: leadId, reason: 'No Response' });
        const property = { ...createSeed().properties[0], title: 'SQL edited villa' };
        await command('saveProperty', property);
        await command('saveSettings', {
          company: 'Database test',
          email: 'admin@example.com',
          phone: '+971501234567',
          defaultView: 'kanban',
        });
        await asRole('anon');
        assert.equal(
          (await db.query('select title from public.properties where id=1')).rows[0].title,
          'SQL edited villa',
        );
        await asRole('authenticated', adminId);
        const original = createSeed();
        original.newsletter = ['legacy@example.com'];
        await db.query('select public.import_crm_data($1::jsonb)', [JSON.stringify(original)]);
        await db.exec('reset role');
        assert.equal(
          (
            await db.query(
              "select email from public.newsletter_subscriptions where email='legacy@example.com'",
            )
          ).rows.length,
          1,
        );
        await asRole('authenticated', adminId);
        assert.equal(
          (await db.query('select title from public.properties where id=1')).rows[0].title,
          'SQL edited villa',
        );
        await db.query('select public.import_crm_data($1::jsonb)', [
          JSON.stringify({ ...original, overwriteExisting: true }),
        ]);
        assert.equal(
          (await db.query('select title from public.properties where id=1')).rows[0].title,
          original.properties[0].title,
        );
        await asRole('anon');
      },
    );
    await t.test(
      'visitor favorites are token-scoped and newsletter records are not publicly readable',
      async () => {
        const token = 'a'.repeat(64),
          other = 'b'.repeat(64);
        const saved = await db.query('select public.visitor_favorites($1,1) as ids', [token]);
        assert.deepEqual(saved.rows[0].ids, [1]);
        assert.deepEqual(
          (await db.query('select public.visitor_favorites($1) as ids', [other])).rows[0].ids,
          [],
        );
        await db.query("select public.subscribe_newsletter('test@example.com')");
        await assert.rejects(
          db.query('select * from public.newsletter_subscriptions'),
          /permission denied/,
        );
        await assert.rejects(
          db.query('select * from public.visitor_preferences'),
          /permission denied/,
        );
      },
    );
  } finally {
    await db.close();
  }
});
