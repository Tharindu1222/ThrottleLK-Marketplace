const SENSITIVE_KEY = /password|token|secret|otp|hash|cookie|authorization/i;

const RESOURCES: Record<string, string> = {
  listings: 'listing',
  dealers: 'dealer',
  'parts-dealers': 'parts_dealer',
  'part-listings': 'part_listing',
  'part-categories': 'part_category',
  users: 'user',
  reports: 'report',
  brands: 'brand',
  models: 'model',
  districts: 'district',
  cities: 'city',
  categories: 'category',
  packages: 'promo_package',
  'bank-accounts': 'promo_bank_account',
  settings: 'promo_settings',
  requests: 'promo_request',
  placements: 'promo_placement',
};

export type AdminAuditDescription = {
  action: string;
  entityType: string;
  entityId: string | null;
  note: string | null;
};

function scalar(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 180) return null;
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

/** Safe summary of an admin request body. Passwords and tokens are never stored. */
export function auditNoteFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const reason = scalar(record.reason);
  if (reason) return reason.slice(0, 500);

  const action = scalar(record.action);
  const note = scalar(record.note);
  const otherKeys = Object.keys(record).filter(
    (key) => key !== 'action' && key !== 'note' && record[key] != null && record[key] !== '',
  );
  if (action && note && otherKeys.length === 0) {
    return `${action}: ${note}`.slice(0, 500);
  }
  if (action && otherKeys.length === 0) return action;

  const parts: string[] = [];
  for (const key of Object.keys(record)) {
    if (SENSITIVE_KEY.test(key)) continue;
    const value = record[key];
    if (value == null || value === '' || typeof value === 'object') continue;
    const shown = scalar(value);
    parts.push(shown ? `${key}=${shown}` : key);
    if (parts.length >= 8) break;
  }
  if (!parts.length) return null;
  return parts.join(', ').slice(0, 500);
}

function responseData(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null;
  const data = (response as { data?: unknown }).data ?? response;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function responseId(response: unknown): string | null {
  const id = responseData(response)?.id;
  return typeof id === 'string' && id ? id : null;
}

/** Short name of the record that changed, taken from the saved response. */
function responseSubject(response: unknown): string | null {
  const data = responseData(response);
  if (!data) return null;
  const named = scalar(data.title) || scalar(data.name) || scalar(data.email);
  if (named) return named;
  const person = [scalar(data.firstName), scalar(data.lastName)].filter(Boolean).join(' ');
  return person || null;
}

/**
 * Turns an admin mutation route into a stable audit action.
 * Reads are ignored. Unknown routes are ignored so public or future GETs stay quiet.
 */
export function describeAdminMutation(input: {
  method: string;
  routePath: string;
  params?: Record<string, string | undefined>;
  body?: unknown;
  response?: unknown;
}): AdminAuditDescription | null {
  const method = input.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  let path = (input.routePath.split('?')[0] ?? '').replace(/^\/api\/v\d+/, '');
  path = path.replace(/^\//, '');
  if (path.startsWith('admin/')) path = path.slice('admin/'.length);

  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'promotions') segments.shift();

  const resourceKey = segments[0];
  if (!resourceKey || resourceKey.startsWith(':')) return null;
  const entityType = RESOURCES[resourceKey];
  if (!entityType || entityType.length > 40) return null;

  const tail = segments.slice(1);
  const staticTail = tail.filter((segment) => !segment.startsWith(':'));
  let verb: string | null = null;
  if (staticTail.includes('approve')) verb = 'approve';
  else if (staticTail.includes('reject')) verb = 'reject';
  else if (staticTail.includes('resolve')) verb = 'resolve';
  else if (staticTail.includes('images') && method === 'POST') verb = 'image.upload';
  else if (staticTail.includes('images') && method === 'DELETE') verb = 'image.delete';
  else if (staticTail.includes('cover') && method === 'POST') verb = 'cover.upload';
  else if (staticTail.includes('cover') && method === 'DELETE') verb = 'cover.delete';
  else if (staticTail.includes('logo') && method === 'POST') verb = 'logo.upload';
  else if (staticTail.includes('logo') && method === 'DELETE') verb = 'logo.delete';
  else if (staticTail.includes('status')) verb = 'status';
  else if (staticTail.includes('end')) verb = 'end';
  else if (method === 'POST') verb = 'create';
  else if (method === 'PATCH' || method === 'PUT') verb = 'update';
  else if (method === 'DELETE') verb = 'delete';
  if (!verb) return null;

  const action = `${entityType}.${verb}`;
  if (action.length > 80) return null;

  const params = input.params ?? {};
  const entityId = params.id || params.imageId || responseId(input.response);
  let note = auditNoteFromBody(input.body);
  if (params.imageId) {
    const imageNote = `image ${params.imageId}`;
    note = note ? `${note}; ${imageNote}`.slice(0, 500) : imageNote;
  }
  const subject = responseSubject(input.response);
  if (subject && !note?.includes(subject)) {
    note = note ? `${subject}; ${note}`.slice(0, 500) : subject;
  }

  return {
    action,
    entityType,
    entityId: entityId ?? null,
    note,
  };
}
