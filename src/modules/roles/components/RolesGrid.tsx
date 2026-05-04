'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { type RoleResponse } from '@/modules/roles/types/role';
import { RoleCard } from '@/modules/roles/components/RoleCard';

export interface RolesGridProps {
  roles: RoleResponse[];
  onEdit: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}

export function RolesGrid({ roles, onEdit, onDelete }: Readonly<RolesGridProps>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
    >
      {roles.map((role, i) => (
        <motion.div
          key={role.id}
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            duration: 0.35,
            bounce: 0,
            delay: shouldReduceMotion ? 0 : i * 0.04,
          }}
        >
          <RoleCard
            role={role}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </motion.div>
      ))}
    </div>
  );
}
