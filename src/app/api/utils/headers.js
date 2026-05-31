function getProjectGroupIdFromToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return payload.projectGroupId || null;
  } catch (e) {
    console.error('Failed to decode ANYTHING_PROJECT_TOKEN', e);
    return null;
  }
}

export function getAnythingHeaders() {
  const token = process.env.ANYTHING_PROJECT_TOKEN;
  const projectGroupId = process.env.NEXT_PUBLIC_PROJECT_GROUP_ID || (token ? getProjectGroupIdFromToken(token) : null);
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (projectGroupId) {
    headers['x-createxyz-project-group-id'] = projectGroupId;
  }
  return headers;
}
