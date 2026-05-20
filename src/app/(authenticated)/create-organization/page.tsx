import { createOrganizationAction } from "@/app/actions/organizationActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import organizations from "@/lib/organizations";
import { requireServerSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function CreateOrganizationPage() {
    const session = await requireServerSession();

    const destination = await organizations.getDefaultOrganizationPathForUser(session.user.id);
    if (destination !== "/create-organization") {
        redirect(destination);
    }

    return (
        <main className="min-h-screen bg-[#f6f1e8] px-6 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <div>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Create organization</h1>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
                        Start your HRMS workspace. We&apos;ll seed the default roles and assign your membership to the
                        organization&apos;s <span className="font-medium text-slate-900">Admin</span> role automatically.
                    </p>
                </div>

                <Card className="border-black/8 bg-white/90 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.25)]">
                    <CardHeader>
                        <CardTitle>Organization details</CardTitle>
                        <CardDescription>
                            This becomes the workspace your team signs into first.
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
                                    className="h-12 rounded-2xl border-slate-200 bg-white"
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
