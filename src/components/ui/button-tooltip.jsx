import Link from "next/link";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const ButtonTooltip = ({
	onClick,
	disabled,
	className,
	children,
	variant,
	type = "button",
	buttonType = "button",
	href = "/",
	size = "sm",
	side = "top",
	label,
	classNameLabel,
}) => {
	return (
		<>
			{type === "button" ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type={buttonType}
							variant={variant}
							size={size}
							onClick={onClick}
							disabled={disabled}
							className={className}
						>
							{children}
						</Button>
					</TooltipTrigger>
					<TooltipContent side={side}>
						<p className={classNameLabel}>{label}</p>
					</TooltipContent>
				</Tooltip>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href={href}
							disabled={disabled}
							className={className}
						>
							{children}
						</Link>
					</TooltipTrigger>
					<TooltipContent side={side}>
						<p className={classNameLabel}>{label}</p>
					</TooltipContent>
				</Tooltip>
			)}
		</>
	);
};
export default ButtonTooltip;
