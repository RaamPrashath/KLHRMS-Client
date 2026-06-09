'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  assignOnboardingCredentialsAction,
  fetchAcceptedOnboardingWorkspaceAction,
  fetchOnboardWorkspaceAction,
  fetchOnboardingPublicAction,
  fetchRolesAction,
  sendOnboardingRequestsAction,
  assignCredentialsAndCreateUserAction,
} from '@/modules/onboarding/api/onboardingServerActions';
import type { OnboardingAssignCredentialsPayload, OnboardingSendPayload } from '@/modules/onboarding/schema/onboardingSchemas';
import type {
  AcceptedOnboardingWorkspace,
  OnboardingAssignCredentialsResponse,
  OnboardingPublic,
  OnboardingSendResponse,
  OnboardWorkspace,
  Role,
} from '@/modules/onboarding/types/onboardingTypes';

export function acceptedOnboardingWorkspaceKey(orgSlug: string, jobSlug: string | null, stageSlug: string | null) {
  return ['accepted-onboarding-workspace', orgSlug, jobSlug ?? 'none', stageSlug ?? 'none'] as const;
}

export function onboardWorkspaceKey(orgSlug: string, jobSlug: string | null, stageSlug: string | null) {
  return ['onboard-workspace', orgSlug, jobSlug ?? 'none', stageSlug ?? 'none'] as const;
}

export function useAcceptedOnboardingWorkspace(
  orgSlug: string,
  memberId: string,
  jobSlug: string | null,
  stageSlug: string | null,
  initialData?: AcceptedOnboardingWorkspace,
) {
  return useQuery<AcceptedOnboardingWorkspace, Error>({
    queryKey: acceptedOnboardingWorkspaceKey(orgSlug, jobSlug, stageSlug),
    queryFn: () =>
      fetchAcceptedOnboardingWorkspaceAction({ orgSlug, memberId, jobSlug: jobSlug ?? '', stageSlug: stageSlug ?? '' }),
    enabled: !!orgSlug && !!memberId && !!jobSlug && !!stageSlug,
    initialData,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useOnboardWorkspace(
  orgSlug: string,
  memberId: string,
  jobSlug: string | null,
  stageSlug: string | null,
  initialData?: OnboardWorkspace,
) {
  return useQuery<OnboardWorkspace, Error>({
    queryKey: onboardWorkspaceKey(orgSlug, jobSlug, stageSlug),
    queryFn: () =>
      fetchOnboardWorkspaceAction({ orgSlug, memberId, jobSlug: jobSlug ?? '', stageSlug: stageSlug ?? '' }),
    enabled: !!orgSlug && !!memberId && !!jobSlug && !!stageSlug,
    initialData,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useSendOnboardingRequests(
  orgSlug: string,
  memberId: string,
  jobSlug: string,
  stageSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation<OnboardingSendResponse, Error, OnboardingSendPayload>({
    mutationFn: (data) => sendOnboardingRequestsAction({ orgSlug, memberId, jobSlug, stageSlug, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: acceptedOnboardingWorkspaceKey(orgSlug, jobSlug, stageSlug),
      });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useAssignCredentials(
  orgSlug: string,
  memberId: string,
  recordId: string,
) {
  const queryClient = useQueryClient();
  return useMutation<OnboardingAssignCredentialsResponse, Error, OnboardingAssignCredentialsPayload>({
    mutationFn: (data) => assignOnboardingCredentialsAction({ orgSlug, memberId, recordId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboard-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useAssignCredentialsAndCreateUser(
  orgSlug: string,
  memberId: string,
  recordId: string,
  organizationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation<{ status: string }, Error, OnboardingAssignCredentialsPayload>({
    mutationFn: (data) =>
      assignCredentialsAndCreateUserAction({
        orgSlug,
        memberId,
        recordId,
        data,
        organizationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboard-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useRoles(orgSlug: string, memberId: string) {
  return useQuery<Role[], Error>({
    queryKey: ['onboarding-roles', orgSlug],
    queryFn: () => fetchRolesAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    retry: false,
  });
}

export function useOnboardingPublic(token: string) {
  return useQuery<OnboardingPublic, Error>({
    queryKey: ['onboarding-public', token],
    queryFn: () => fetchOnboardingPublicAction(token),
    enabled: !!token,
    retry: false,
  });
}
