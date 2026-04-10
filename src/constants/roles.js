export const ROLES = {
  owner: 'owner',
  supervisor: 'supervisor',
  worker: 'worker',
};

export function isManager(role) {
  return role === ROLES.owner || role === ROLES.supervisor;
}

export function isOwner(role) {
  return role === ROLES.owner;
}
