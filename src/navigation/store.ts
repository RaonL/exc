import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResourcePage } from './resource-catalog';
export type LocalResource = {
  id: string;
  page: ResourcePage;
  namespace: string;
  name: string;
  description: string;
  values: Record<string, string>;
  updatedAt: string;
};
interface State {
  resources: LocalResource[];
  save: (resource: LocalResource) => void;
  remove: (id: string) => void;
}
export const useNavigationResources = create<State>()(
  persist(
    (set, get) => ({
      resources: [],
      save: (resource) => {
        if (!/^[a-z][a-z0-9-]{1,62}$/.test(resource.name))
          throw Error('Name: use 2–63 lowercase letters, numbers or hyphens.');
        if (
          get().resources.some(
            (r) =>
              r.id !== resource.id &&
              r.namespace === resource.namespace &&
              r.page === resource.page &&
              r.name === resource.name,
          )
        )
          throw Error('Name already exists in this Namespace.');
        set((s) => ({ resources: [...s.resources.filter((r) => r.id !== resource.id), resource] }));
      },
      remove: (id) => set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),
    }),
    { name: 'f5-xc-navigation-resources-v1' },
  ),
);
