'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  useCreateJobRequisition,
  useUpdateJobRequisition,
} from '@/modules/jobs/hooks/useJobRequisitionMutations';
import type {
  CreateJobRequisitionInput,
  UpdateJobRequisitionInput,
} from '@/modules/jobs/schema/jobRequisitionSchemas';

interface AutoSaveDraftOptions {
  orgSlug: string;
  memberId: string;
  formValues: Record<string, unknown>;
  draftId?: string | null;
  enabled?: boolean;
}

export function useAutoSaveDraft({
  orgSlug,
  memberId,
  formValues,
  draftId,
  enabled = true,
}: AutoSaveDraftOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdDraftId, setCreatedDraftId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSerializedRef = useRef<string | null>(null);
  const lastSavedSerializedRef = useRef<string | null>(null);
  const latestValuesRef = useRef(formValues);
  const createMutation = useCreateJobRequisition(orgSlug, memberId);
  const updateMutation = useUpdateJobRequisition(orgSlug, memberId);
  const serializedValues = JSON.stringify(formValues);
  const currentDraftId = draftId ?? createdDraftId;

  useEffect(() => {
    latestValuesRef.current = formValues;
  }, [formValues]);

  const save = useCallback(async (): Promise<string | null> => {
    if (!enabled) return currentDraftId;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const valuesToSave = latestValuesRef.current;
    const serializedValuesToSave = JSON.stringify(valuesToSave);
    setIsSaving(true);
    setError(null);
    try {
      if (currentDraftId) {
        await updateMutation.mutateAsync({
          requisitionId: currentDraftId,
          data: valuesToSave as UpdateJobRequisitionInput,
        });
        lastSavedSerializedRef.current = serializedValuesToSave;
        setLastSaved(new Date());
        return currentDraftId;
      } else {
        const result = await createMutation.mutateAsync(
          valuesToSave as CreateJobRequisitionInput,
        );
        setCreatedDraftId(result.id);
        lastSavedSerializedRef.current = serializedValuesToSave;
        setLastSaved(new Date());
        return result.id;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [createMutation, currentDraftId, enabled, updateMutation]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (initialSerializedRef.current === null) {
      initialSerializedRef.current = serializedValues;
      return;
    }
    if (serializedValues === initialSerializedRef.current) return;
    if (serializedValues === lastSavedSerializedRef.current) return;
    if (typeof formValues.title !== 'string' || !formValues.title.trim()) return;

    timerRef.current = setTimeout(() => {
      void save().catch(() => undefined);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, formValues.title, save, serializedValues]);

  return {
    isSaving,
    lastSaved,
    error,
    save,
    draftId: currentDraftId,
  };
}
