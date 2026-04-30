import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createOrganizationAction } from "@/app/actions/organizationActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import organizations from "@/lib/organizations";

export default async function OrganizationsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        redirect("/login");
    }

    const orgs = await organizations.getOrganizationsForUser(session.user.id);

    return (
        <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground">Organizations</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Welcome, {session.user.name ?? session.user.email}. Choose an organization
                        or create a new one to continue.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Your organizations</CardTitle>
                        <CardDescription>Access your existing tenants.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {orgs.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                                You are not a member of any organization yet.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {orgs.map((org) => {
                                    const memberRole = org.members[0].role?.name ?? "EMPLOYEE";

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
                                                    <span className="rounded-full border border-border px-2 py-1 text-[11px] font-medium text-foreground/80">
                                                        {memberRole}
                                                    </span>
                                                    <span>{org._count.members} members</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Create organization</CardTitle>
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
