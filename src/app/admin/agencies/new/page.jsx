import { AgencyForm } from "@/components/admin/agency-form";

export const metadata = { title: "Nouvelle agence — AERIA Admin" };

export default function NewAgencyPage() {
	return (
		<div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-neutral-100">
			<div className="max-w-3xl rounded-xl shadow-sm">
				<AgencyForm />
			</div>
		</div>
	);
}
