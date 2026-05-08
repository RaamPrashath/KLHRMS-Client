import { redirect } from "next/navigation";
import Link from "next/link";

import {
    createOrganizationAction,
    joinOrganizationAction,
} from "@/app/actions/organizationActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import organizations from "@/lib/organizations";
import { requireServerSession } from "@/lib/server-session";
import { cn } from "@/lib/utils";

export default async function OrganizationsPage() {
    const session = await requireServerSession();

    const [myOrgs, discoverableOrgs] = await Promise.all([
        organizations.getOrganizationsForUser(session.user.id),
        organizations.getDiscoverableOrganizations(session.user.id),
    ]);

    return (
        <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">Organizations</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Welcome, {session.user.name ?? session.user.email}. Choose an organization
                        or create a new one to continue.
                    </p>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/careers">Browse public careers</Link>
                        </Button>
                    </div>
                </div>

                {/* ── Your organizations ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your organizations</CardTitle>
                        <CardDescription>Organizations you are a member of.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {myOrgs.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                                You are not a member of any organization yet. Join one below or create your own.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {myOrgs.map((org) => {
                                    const roleName = org.members[0]?.role?.name ?? null;

                                    return (
                                        <Link
                                            key={org.id}
                                            href={`/${org.slug}`}
                                            className="group rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/40 hover:bg-muted/20"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {org.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        /{org.slug}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    {roleName && (
                                                        <span className={cn(
                                                            "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                                            "bg-[rgba(174,174,178,0.12)] text-[#6e6e73]",
                                                        )}>
                                                            {roleName}
                                                        </span>
                                                    )}
                                                    <span>{org._count.members} member{org._count.members !== 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Discover & join ── */}
                {discoverableOrgs.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Discover organizations</CardTitle>
                            <CardDescription>
                                Join an existing organization. You will be added as an Employee.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {discoverableOrgs.map((org) => (
                                    <div
                                        key={org.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {org.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                /{org.slug} · {org._count.members} member{org._count.members !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <form
                                            action={async () => {
                                                "use server";
                                                await joinOrganizationAction(org.id);
                                            }}
                                        >
                                            <Button type="submit" variant="outline" size="sm">
                                                Join
                                            </Button>
                                        </form>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Create organization ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create organization</CardTitle>
                        <CardDescription>
                            Start a new organization. You will be assigned as Super Admin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createOrganizationAction} className="flex flex-col gap-5">
                            <Field>
                                <FieldLabel htmlFor="name">Organization name</FieldLabel>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="Acme HR"
                                    autoComplete="organization"
                                    required
                                />
                            </Field>

                            <Button type="submit" className="w-full sm:w-fit">
                                Create organization
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
