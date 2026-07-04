import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserCreateForm } from "@/components/admin/user-create-form";

export default function NewUserPage() {
	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto bg-neutral-100">
			<div className="flex items-center justify-end mb-2">
				<Link href="/admin/users">
					<Button className="rounded-sm shadow-sm active:shadow-inner">Retour aux Membres</Button>
				</Link>
			</div>

			<h2 className="text-3xl font-bold text-center">Créer un membre</h2>
			<p className="text-center text-muted-foreground">Crée un compte avec rôle et membership définis dès l&apos;onboarding.</p>

			<UserCreateForm />
		</div>
	);
}
