import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { useCatalog } from '../../../hooks/useCatalog';
import { Photo } from '../../../components/ui';
import { selectWorkspace } from '../store';
import { money } from '../constants';
import {
  Badge,
  Button,
  DataTable,
  Field,
  FormDialog,
  PageHeading,
  Pagination,
  Panel,
  useCommand,
} from '../components/UI';
function PropertyForm({ property, onClose }) {
  const { locations, categories } = useCatalog();
  const run = useCommand();
  const [imageText, setImageText] = useState(property?.images.join('\n') || '');
  return (
    <FormDialog
      title={property ? 'Edit property' : 'Add property'}
      onClose={onClose}
      onSubmit={(fields) => {
        const location = locations.find((l) => l.slug === fields.locationSlug);
        return run(
          'saveProperty',
          {
            ...fields,
            id: property?.id,
            location: location.name,
            featured: fields.featured === 'on',
          },
          'Property saved. Public catalog updated.',
        );
      }}
    >
      <Field label="Title" name="title" defaultValue={property?.title} required />
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
export function Properties() {
  const data = useSelector(selectWorkspace);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const run = useCommand();
  const rows = data.properties.filter(
    (p) =>
      `${p.title} ${p.location}`.toLowerCase().includes(query.toLowerCase()) &&
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
        <Button onClick={() => setEdit({})}>+ Add property</Button>
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
                  onClick={async () => {
                    try {
                      await run(
                        'saveProperty',
                        { ...p, featured: !p.featured },
                        'Featured selection updated.',
                      );
                    } catch (e) {
                      setError(e.message);
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
                <Button secondary onClick={() => setEdit(p)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
        <Pagination page={current} count={rows.length} onChange={setPage} />
      </Panel>
      {(edit || params.get('add')) && (
        <PropertyForm property={edit?.id ? edit : null} onClose={close} />
      )}
    </>
  );
}
