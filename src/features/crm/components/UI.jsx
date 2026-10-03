import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Inbox, ArrowUpRight } from 'lucide-react';
import { label, dateTime } from '../constants';
import { useToast } from '../../../components/ui';
import { crmService } from '../../../services/crmService';

export function Button({ children, to, secondary, danger, className = '', ...props }) {
  const classes = `crm-button ${secondary ? 'secondary' : ''} ${danger ? 'danger' : ''} ${className}`;
  return to ? (
    <Link className={classes} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
}
export function Badge({ value }) {
  return <span className={`crm-badge badge-${value?.toLowerCase()}`}>{label(value)}</span>;
}
export function PageHeading({ title, subtitle, children }) {
  return (
    <div className="crm-page-heading">
      <div>
        <p className="crm-eyebrow">DUBAI HOUSE / WORKSPACE</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="crm-actions">{children}</div>
    </div>
  );
}
export function Panel({ title, children, action, className = '' }) {
  return (
    <section className={`crm-panel ${className}`}>
      {title && (
        <div className="crm-panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  text = 'Try adjusting your filters or add a new record.',
  children,
}) {
  return (
    <div className="crm-empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function StatCard({ title, value, detail, icon: Icon }) {
  return (
    <div className="crm-stat">
      <div>
        <span>{title}</span>
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      <small>{detail || 'From your current CRM data'}</small>
    </div>
  );
}
export function Field({ label: title, name, options, type = 'text', children, ...props }) {
  return (
    <label className="crm-field">
      <span>{title}</span>
      {options ? (
        <select name={name} aria-label={title} {...props}>
          {options.map((option) => {
            const [value, text] = Array.isArray(option) ? option : [option, label(option)];
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea name={name} aria-label={title} rows={3} {...props} />
      ) : (
        <input name={name} aria-label={title} type={type} {...props} />
      )}{' '}
      {children}
    </label>
  );
}
export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    const overflow = document.body.style.overflow;
    el.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="crm-dialog crm"
      dir="ltr"
      lang="en"
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label="Close dialog" className="crm-icon" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function FormDialog({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = 'Save',
  description,
  danger = false,
  submitDisabled = false,
  pendingLabel = 'Saving…',
}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  return (
    <Dialog title={title} onClose={() => !submitting.current && onClose()}>
      <form
        aria-busy={pending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (submitting.current || submitDisabled) return;
          const fields = Object.fromEntries(new FormData(event.currentTarget));
          submitting.current = true;
          setError('');
          setPending(true);
          try {
            await onSubmit(fields);
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            submitting.current = false;
            setPending(false);
          }
        }}
      >
        {description && <p className="crm-muted">{description}</p>}
        <fieldset className="crm-form-grid" disabled={pending}>
          {children}
        </fieldset>
        {error && (
          <p className="crm-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <Button secondary onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" danger={danger} disabled={pending || submitDisabled}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
export function useCommand() {
  const toast = useToast();
  return async (command, data, message = 'Changes saved.') => {
    const result = await crmService.execute(command, data);
    toast(message);
    return result;
  };
}
export function Pagination({ page, count, size = 10, onChange }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="crm-pagination">
      <span>
        {count} records · Page {page} of {pages}
      </span>
      <div className="crm-actions">
        <Button secondary disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button secondary disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
export function DataTable({ columns, rows, rowKey = 'id', empty }) {
  return rows.length ? (
    <div className="crm-table-scroll">
      <table className="crm-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.title} scope="col">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((c) => (
                <td key={c.title}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title={empty || 'No matching records'} />
  );
}
export function Timeline({ activities }) {
  return activities.length ? (
    <ol className="crm-timeline">
      {[...activities]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((a) => (
          <li key={a.id}>
            <i />
            <div>
              <strong>{a.message}</strong>
              <p>
                {a.author} · {dateTime(a.createdAt)}
              </p>
            </div>
          </li>
        ))}
    </ol>
  ) : (
    <EmptyState title="No activity yet" />
  );
}
export function Bars({ entries, format = (value) => value }) {
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <div
      className="crm-bars"
      role="img"
      aria-label={entries.map(([key, value]) => `${label(key)}: ${format(value)}`).join(', ')}
    >
      {entries.map(([key, value]) => (
        <div key={key}>
          <span>{label(key)}</span>
          <div>
            <i style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <strong>{format(value)}</strong>
        </div>
      ))}
    </div>
  );
}
export function RecordLink({ to, children }) {
  return (
    <Link className="crm-record-link" to={to}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
