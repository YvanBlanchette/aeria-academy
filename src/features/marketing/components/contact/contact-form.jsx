"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState = {
	status: "idle",
	message: "",
	fieldErrors: {},
};

function SubmitButton({ label, loadingLabel }) {
	const { pending } = useFormStatus();

	return (
		<Button
			type="submit"
			className="w-full"
			disabled={pending}
		>
			{pending ? loadingLabel : label}
		</Button>
	);
}

export default function ContactForm({ action, locale = "fr" }) {
	const isFrench = locale === "fr";
	const formRef = useRef(null);
	const [state, formAction] = useActionState(action, initialState);

	useEffect(() => {
		if (state.status === "success") {
			formRef.current?.reset();
		}
	}, [state.status]);

	return (
		<form
			ref={formRef}
			action={formAction}
			className="space-y-5"
		>
			<input
				type="hidden"
				name="locale"
				value={locale}
			/>
			<div className="hidden">
				<Label htmlFor="website">Website</Label>
				<Input
					id="website"
					name="website"
					tabIndex={-1}
					autoComplete="off"
				/>
			</div>

			<div className="grid gap-5 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="fullName">{isFrench ? "Nom complet" : "Full name"}</Label>
					<Input
						id="fullName"
						name="fullName"
						placeholder={isFrench ? "Ex.: Yvan Junior Blanchette" : "Ex.: Jane Doe"}
						required
					/>
					{state.fieldErrors?.fullName ? <p className="text-xs text-destructive">{state.fieldErrors.fullName}</p> : null}
				</div>

				<div className="space-y-2">
					<Label htmlFor="email">{isFrench ? "Courriel" : "Email"}</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder={isFrench ? "votre@email.com" : "you@email.com"}
						required
					/>
					{state.fieldErrors?.email ? <p className="text-xs text-destructive">{state.fieldErrors.email}</p> : null}
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="subject">{isFrench ? "Sujet" : "Subject"}</Label>
				<Input
					id="subject"
					name="subject"
					placeholder={isFrench ? "Votre sujet" : "Your subject"}
					required
				/>
				{state.fieldErrors?.subject ? <p className="text-xs text-destructive">{state.fieldErrors.subject}</p> : null}
			</div>

			<div className="space-y-2">
				<Label htmlFor="message">{isFrench ? "Message" : "Message"}</Label>
				<Textarea
					id="message"
					name="message"
					placeholder={isFrench ? "Ecrivez votre message ici..." : "Write your message here..."}
					rows={6}
					required
				/>
				{state.fieldErrors?.message ? <p className="text-xs text-destructive">{state.fieldErrors.message}</p> : null}
			</div>

			<div className="space-y-2">
				<label className="flex items-start gap-3 text-sm text-muted-foreground">
					<input
						type="checkbox"
						name="consent"
						value="yes"
						className="mt-1 h-4 w-4 rounded border-input"
						required
					/>
					<span>
						{isFrench
							? "J'accepte que mes informations soient utilisees pour me recontacter dans le cadre de ma demande."
							: "I agree that my information may be used to contact me regarding my request."}
					</span>
				</label>
				{state.fieldErrors?.consent ? <p className="text-xs text-destructive">{state.fieldErrors.consent}</p> : null}
			</div>

			{state.message ? <p className={state.status === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}>{state.message}</p> : null}

			<SubmitButton
				label={isFrench ? "Envoyer le message" : "Send message"}
				loadingLabel={isFrench ? "Envoi en cours..." : "Sending..."}
			/>
		</form>
	);
}
