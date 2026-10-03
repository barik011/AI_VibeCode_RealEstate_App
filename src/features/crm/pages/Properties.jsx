import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../../../hooks/useCatalog';
import { Photo } from '../../../components/ui';
import { selectWorkspace } from '../store';
import { money } from '../constants';
import { propertyImpact } from '../propertyRules';
import {
  Badge,
  Button,
  DataTable,
  Field,
  FormDialog,
  PageHeading,
  Pagination,
  Panel,
  Timeline,
  useCommand,
} from '../components/UI';
function PropertyForm({ property, onClose }) {
  const { locations = [], categories = [], loading, error } = useCatalog();
  const run = useCommand();
  const [imageText, setImageText] = useState(property?.images.join('\n') || '');
  if (loading || error)
    return (
      <FormDialog
        title="Property catalog"
        onClose={onClose}
        onSubmit={() => {
          throw new Error(error || 'Catalog is still loading.');
        }}
      >
        <p>{error || 'Loading locations and categories…'}</p>
      </FormDialog>
    );
  return (
    <FormDialog
      title={property ? 'Edit property' : 'Add property'}
      onClose={onClose}
      onSubmit={(fields) => {
        const location = locations.find((l) => l.slug === fields.locationSlug);
        if (!location) throw new Error('Select a valid location.');
        return run(
          'saveProperty',
          {
            ...fields,
            id: property?.id,
            expectedVersion: property?.version || 1,
            location: location.name,
            featured: fields.featured === 'on',
          },
          'Property saved. Public catalog updated.',
        );
      }}
    >
      <Field label="Title" name="title" defaultValue={property?.title} required maxLength={200} />
      <Field
        label="Purpose"
        name="purpose"
        options={[
          ['buy', 'Buy'],
          ['rent', 'Rent'],
          ['off-plan', 'Off-plan'],
          ['commercial', 'Commercial'],
        ]}
        defaultValue={property?.purpose}
      />
      <Field
        label="Category"
        name="category"
        options={categories.map((c) => [c.slug, c.name])}
        defaultValue={property?.category}
      />
      <Field
        label="Location"
        name="locationSlug"
        options={locations.map((l) => [l.slug, l.name])}
        defaultValue={property?.locationSlug}
      />
      <Field
        label="Price (AED)"
        name="price"
        type="number"
        min="1"
        step="0.01"
        required
        defaultValue={property?.price}
      />
      <Field
        label="Bedrooms"
        name="bedrooms"
        type="number"
        min="0"
        step="1"
        required
        defaultValue={property?.bedrooms || 0}
      />
      <Field
        label="Bathrooms"
        name="bathrooms"
        type="number"
        min="0"
        step="1"
        required
        defaultValue={property?.bathrooms || 0}
      />
      <Field
        label="Area (sq ft)"
        name="area"
        type="number"
        min="1"
        required
        defaultValue={property?.area}
      />
      <Field
        label="Status"
        name="status"
        options={['ACTIVE', 'DRAFT', 'SOLD', 'RENTED', 'INACTIVE']}
        defaultValue={property?.status || 'DRAFT'}
      />
      <label className="crm-check">
        <input name="featured" type="checkbox" defaultChecked={property?.featured} /> Featured
        property
      </label>
      <Field
        label="Description"
        name="description"
        type="textarea"
        required
        maxLength={10000}
        defaultValue={property?.description}
      />
      <Field
        label="Amenities (comma separated)"
        name="amenities"
        type="textarea"
        defaultValue={property?.amenities.join(', ')}
      />
      <Field
        label="Image URLs (one per line)"
        name="images"
        type="textarea"
        required
        value={imageText}
        onChange={(e) => setImageText(e.target.value)}
      />
      {/^https?:\/\//.test(imageText.split('\n')[0]) && (
        <Photo
          className="crm-image-preview"
          src={imageText.split('\n')[0]}
          alt="Property image preview"
        />
      )}
    </FormDialog>
  );
}
function DeletePropertyDialog({ property, data, onClose }) {
  const run = useCommand();
  const impact = propertyImpact(data, property.id);
  const [archiveInstead, setArchive] = useState(false);
  const archive = Boolean(impact.linked) || archiveInstead;
  const [confirmTitle, setConfirmTitle] = useState('');
  return (
    <FormDialog
      title="Delete property"
      onClose={onClose}
      danger={!archive}
      submitLabel={archive ? 'Archive property' : 'Delete property'}
      pendingLabel={archive ? 'Archiving…' : 'Deleting…'}
      onSubmit={() =>
        run(
          archive ? 'archiveProperty' : 'deleteProperty',
          {
            id: property.id,
            expectedVersion: property.version || 1,
            confirmTitle,
          },
          archive ? 'Property archived. CRM history preserved.' : 'Property deleted.',
        )
      }
    >
      <p className="crm-muted">
        {impact.linked
          ? `This property is linked to ${impact.leads} leads or deals and ${impact.viewings} viewings. It can be archived to remove it from the public catalog while preserving this history.`
          : 'Deleting this property permanently removes it from the catalog. You can archive it instead to keep the record.'}
      </p>
      {!impact.linked && (
        <label className="crm-check">
          <input
            type="checkbox"
            checked={archive}
            onChange={(event) => setArchive(event.target.checked)}
          />
          Archive instead of permanently deleting
        </label>
      )}
      {!archive && (
        <Field
          label="Type property title to confirm"
          value={confirmTitle}
          onChange={(event) => setConfirmTitle(event.target.value)}
          required
          autoComplete="off"
        />
      )}
      <p>
        <strong>{property.title}</strong>
      </p>
    </FormDialog>
  );
}
export function Properties() {
  const data = useSelector(selectWorkspace);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [savingFeatured, setSavingFeatured] = useState(null);
  const [error, setError] = useState('');
  const run = useCommand();
  const rows = data.properties.filter(
    (p) =>
      `${p.title} ${p.location} ${p.reference}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!status || p.status === status) &&
      (!purpose || p.purpose === purpose) &&
      (!params.get('property') || String(p.id) === params.get('property')),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const close = () => {
    setEdit(null);
    setParams({});
  };
  return (
    <>
      <PageHeading
        title="Property portfolio"
        subtitle="Manage the collection your customers discover on the public website."
      >
        <Button
          className="crm-icon-action"
          aria-label="Add property"
          title="Add property"
          onClick={() => setEdit({})}
        >
          <Plus size={18} />
        </Button>
      </PageHeading>
      <Panel>
        <div className="crm-work-filters">
          <Field
            label="Search properties"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <Field
            label="Property status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[['', 'All statuses'], 'ACTIVE', 'DRAFT', 'SOLD', 'RENTED', 'INACTIVE']}
          />
          <Field
            label="Purpose"
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value);
              setPage(1);
            }}
            options={[
              ['', 'All purposes'],
              ['buy', 'Buy'],
              ['rent', 'Rent'],
              ['off-plan', 'Off-plan'],
              ['commercial', 'Commercial'],
            ]}
          />
          {params.get('property') && (
            <Button secondary onClick={() => setParams({})}>
              Show all properties
            </Button>
          )}
        </div>
        {error && (
          <p className="crm-error" role="alert">
            {error}
          </p>
        )}
        <DataTable
          rows={rows.slice((current - 1) * 10, current * 10)}
          columns={[
            {
              title: 'Property',
              render: (p) => (
                <div className="crm-property-cell">
                  <Photo src={p.images[0]} alt={p.title} />
                  <span>
                    <strong>{p.title}</strong>
                    <small>{p.location}</small>
                  </span>
                </div>
              ),
            },
            { title: 'Price', render: (p) => money(p.price) },
            { title: 'Purpose', render: (p) => p.purpose },
            { title: 'Status', render: (p) => <Badge value={p.status} /> },
            {
              title: 'Featured',
              render: (p) => (
                <button
                  className="crm-text-button"
                  aria-label={`${p.featured ? 'Unfeature' : 'Feature'} ${p.title}`}
                  disabled={savingFeatured !== null}
                  onClick={async () => {
                    setSavingFeatured(p.id);
                    setError('');
                    try {
                      await run(
                        'setPropertyFeatured',
                        { id: p.id, featured: !p.featured, expectedVersion: p.version || 1 },
                        'Featured selection updated.',
                      );
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setSavingFeatured(null);
                    }
                  }}
                >
                  {p.featured ? '★ Featured' : '☆ Feature'}
                </button>
              ),
            },
            {
              title: 'Actions',
              render: (p) => (
                <div className="crm-actions">
                  <Button
                    secondary
                    className="crm-icon-action"
                    aria-label={`Edit ${p.title}`}
                    title={`Edit ${p.title}`}
                    onClick={() => setEdit(p)}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    danger
                    className="crm-icon-action"
                    aria-label={`Delete ${p.title}`}
                    title={`Delete ${p.title}`}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <Pagination page={current} count={rows.length} onChange={setPage} />
      </Panel>
      <Panel title="Recent property changes">
        <Timeline activities={(data.propertyEvents || []).slice(0, 20)} />
      </Panel>
      {deleting && (
        <DeletePropertyDialog property={deleting} data={data} onClose={() => setDeleting(null)} />
      )}
      {(edit || params.get('add')) && (
        <PropertyForm property={edit?.id ? edit : null} onClose={close} />
      )}
    </>
  );
}
