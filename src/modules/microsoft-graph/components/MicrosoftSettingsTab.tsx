"use client";

import { useEffect, useRef, useState } from "react";
import { useMicrosoftSettings, useMicrosoftSyncStatus, useSaveMicrosoftSettings } from "@/modules/microsoft-graph/hooks/useMicrosoftSettings";
import { useSyncEmployees } from "@/modules/microsoft-graph/hooks/useSyncEmployees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface MicrosoftSettingsTabProps {
  orgSlug: string;
  memberId: string;
}

export function MicrosoftSettingsTab({ orgSlug, memberId }: MicrosoftSettingsTabProps) {
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useMicrosoftSettings(orgSlug, memberId);
  const { data: syncStatus, refetch: refetchStatus } = useMicrosoftSyncStatus(orgSlug, memberId);
  const saveMutation = useSaveMicrosoftSettings(orgSlug, memberId);

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [lastTestedSecret, setLastTestedSecret] = useState("");

  const syncMutation = useSyncEmployees(orgSlug, memberId);
  const hasInitialisedSettings = useRef(false);

  useEffect(() => {
    if (!settings || hasInitialisedSettings.current) return;
    setTenantId((current) => current || settings.tenant_id || "");
    setClientId((current) => current || settings.client_id || "");
    setClientSecret((current) => current || settings.client_secret || "");
    hasInitialisedSettings.current = true;
  }, [settings]);

  const isConfigured = syncStatus?.is_configured ?? false;
  const lastSync = syncStatus?.last_sync_at ? new Date(syncStatus.last_sync_at + "Z").toLocaleString() : null;
  const summary = syncStatus?.last_sync_summary;

  const testPassed = testResult?.ok === true;
  const canSave = testPassed && !saveMutation.isPending;
  const currentSecret = tenantId.trim() + clientId.trim() + clientSecret.trim();

  async function handleTestConnection(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      const { testMicrosoftConnectionAction } = await import("@/modules/microsoft-graph/api/microsoftGraphServerActions");
      const result = await testMicrosoftConnectionAction({
        orgSlug, memberId,
        credentials: { tenant_id: tenantId.trim(), client_id: clientId.trim(), client_secret: clientSecret.trim() },
      });
      if (result.connected) {
        setTestResult({ ok: true, msg: `Connected to ${result.tenant_name}` });
        setLastTestedSecret(clientSecret.trim());
      } else {
        setTestResult({ ok: false, msg: result.error ?? "Connection failed" });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    saveMutation.mutate(
      { tenant_id: tenantId.trim(), client_id: clientId.trim(), client_secret: lastTestedSecret || clientSecret.trim() },
      { onSuccess: () => { refetchStatus(); setTestResult({ ok: true, msg: "Settings saved" }); } },
    );
  }

  function handleSync() {
    syncMutation.mutate(undefined, { onSuccess: () => refetchStatus() });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Microsoft Integration</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Connect to Microsoft Entra ID to sync users into this organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Enter your Microsoft Entra app registration details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTestConnection} className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="tenantId">Tenant ID (Directory ID)</FieldLabel>
              <Input
                id="tenantId"
                type="text"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="clientId">Client ID (Application ID)</FieldLabel>
              <Input
                id="clientId"
                type="text"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="clientSecret">Client Secret</FieldLabel>
              <Input
                id="clientSecret"
                type="text"
                placeholder="Paste your client secret value"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
              />
            </Field>

            {testResult && (
              <p className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-600"}`}>
                {testResult.msg}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="w-full sm:w-fit" disabled={testing || settingsLoading}>
                {testing ? "Testing..." : "Test Connection"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-fit"
                disabled={!canSave}
                onClick={handleSave}
              >
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync</CardTitle>
          <CardDescription>
            Fetch users from Microsoft Entra ID and sync them into this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block size-2 rounded-full ${isConfigured ? "bg-green-500" : "bg-neutral-300"}`} />
            <span className="text-sm text-neutral-700">
              {isConfigured ? "Connected" : "Not connected — save your credentials first"}
            </span>
          </div>
          {isConfigured && syncStatus && (
            <div className="text-sm text-neutral-500 space-y-1">
              <p>Tenant: {syncStatus.tenant_id}</p>
              {lastSync && <p>Last sync: {lastSync}</p>}
              {syncStatus.last_sync_status && (
                <p>
                  Status:{" "}
                  <span className={syncStatus.last_sync_status === "success" ? "text-green-600" : "text-amber-600"}>
                    {syncStatus.last_sync_status}
                  </span>
                </p>
              )}
            </div>
          )}
          <Button
            type="button"
            onClick={handleSync}
            disabled={syncMutation.isPending || !isConfigured}
          >
            {syncMutation.isPending ? "Syncing..." : "Sync Users Now"}
          </Button>

          {syncMutation.isSuccess && syncMutation.data && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 space-y-1">
              <p className="font-medium">Sync completed</p>
              <p>Total fetched: {syncMutation.data.total_fetched}</p>
              <p>Created: {syncMutation.data.created_count}</p>
              <p>Updated: {syncMutation.data.updated_count}</p>
              {syncMutation.data.failed_count > 0 && (
                <p className="text-red-600">Failed: {syncMutation.data.failed_count}</p>
              )}
            </div>
          )}

          {syncMutation.isError && (
            <p className="text-sm text-red-600">
              {syncMutation.error instanceof Error ? syncMutation.error.message : "Sync failed"}
            </p>
          )}

          {summary && !syncMutation.isSuccess && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 space-y-1">
              <p className="font-medium">Last sync results</p>
              <p>Total: {summary.total} | Created: {summary.created} | Updated: {summary.updated} | Failed: {summary.failed}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
