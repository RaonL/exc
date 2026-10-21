import type { Definition, FileResource } from './store';

export function protectionResourceProgress(
  namespace: string,
  files: Pick<FileResource, 'id' | 'namespace'>[],
  definitions: Pick<Definition, 'id' | 'namespace' | 'fileIds'>[],
  attachedId: string,
): boolean[] {
  const available = definitions.filter(d =>
    (d.namespace === namespace || d.namespace === 'shared') && d.fileIds.length > 0 &&
    d.fileIds.every(id => files.some(f => f.id === id && (f.namespace === d.namespace || f.namespace === 'shared'))),
  );
  return [
    files.some(f => f.namespace === namespace || f.namespace === 'shared'),
    available.length > 0,
    available.some(d => d.id === attachedId),
  ];
}
