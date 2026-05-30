"use client";

import { useEffect, useRef, useState } from "react";
import { useMicrosoftSettings, useMicrosoftSyncStatus } from "@/modules/microsoft-graph/hooks/useMicrosoftSettings";
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

  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [hasConfiguredCredentials, setHasConfiguredCredentials] = useState(false);
  const hasInitialisedSettings = useRef(false);

  const syncMutation = useSyncEmployees(orgSlug, memberId);

  useEffect(() => {
    if (!settings || hasInitialisedSettings.current) {
      return;
    }

    setTenantId((current) => current || settings.tenant_id || "");
    setClientId((current) => current || settings.client_id || "");
    setClientSecret((current) => current || "");
    setHasConfiguredCredentials((current) => current || Boolean(settings.client_secret_configured || settings.is_enabled));
    hasInitialisedSettings.current = true;
  }, [settings]);

  const isConfigured = hasConfiguredCredentials || (syncStatus?.is_configured ?? false);
  const lastSync = syncStatus?.last_sync_at ? new Date(syncStatus.last_sync_at + "Z").toLocaleString() : null;
  const summary = syncStatus?.last_sync_summary;

  async function handleTestConnection(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setConnectionResult(null);
    try {
      const { testMicrosoftConnectionAction } = await import("@/modules/microsoft-graph/api/microsoftGraphServerActions");
      const tenantValue = tenantId.trim();
      const clientValue = clientId.trim();
      const secretValue = clientSecret.trim();
      const result = await testMicrosoftConnectionAction({
        orgSlug,
        memberId,
        credentials: { tenant_id: tenantValue, client_id: clientValue, client_secret: secretValue },
      });
      setHasConfiguredCredentials(true);
      setClientSecret("");
      if (result.connected) {
        setConnectionResult({ ok: true, msg: `Saved and connected to ${result.tenant_name}` });
      } else {
        setConnectionResult({ ok: false, msg: `Credentials saved, but connection failed: ${result.error ?? "Connection failed"}` });
      }
      await Promise.all([refetchSettings(), refetchStatus()]);
    } catch (err) {
      setConnectionResult({ ok: false, msg: err instanceof Error ? err.message : "Connection test failed" });
    } finally {
      setTesting(false);
    }
  }

  function handleSync() {
    syncMutation.mutate(undefined, {
      onSuccess: () => refetchStatus(),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Microsoft Integration</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Save your Microsoft Entra app credentials here. They are stored encrypted in the backend and used for user sync.
        </p>
      </div>

      {/* Credentials + Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
          <CardDescription>
            Enter the tenant ID, client ID, and client secret for your Microsoft Entra app registration. Saving also verifies the connection.
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
              <FieldLabel htmlFor="clientSecret">
                Client Secret {settings?.client_secret_configured ? "(leave empty to keep current)" : ""}
              </FieldLabel>
              <Input
                id="clientSecret"
                type="password"
                placeholder={settings?.client_secret_configured ? "••••••••••••••••" : "Enter client secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
              />
            </Field>

            {connectionResult && (
              <p className={`text-sm ${connectionResult.ok ? "text-green-600" : "text-red-600"}`}>
                {connectionResult.msg}
              </p>
            )}

            <Button type="submit" className="w-full sm:w-fit" disabled={testing || settingsLoading}>
              {testing ? "Saving and testing..." : "Save & test connection"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Sync</CardTitle>
          <CardDescription>
            Fetch Microsoft Entra users and store the core HR profile fields in this organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block size-2 rounded-full ${isConfigured ? "bg-green-500" : "bg-neutral-300"}`} />
            <span className="text-sm text-neutral-700">
              {isConfigured ? "Configured" : "Not configured — enter credentials and save them first"}
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
